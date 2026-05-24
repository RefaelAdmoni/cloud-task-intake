import { Pool } from "pg";
import pino from "pino";
import { config } from "./config";

// Re-use queue provider types and implementations from the shared pattern
// (worker has its own node_modules but the same code structure)
import { EventEmitter } from "events";

const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  name: "worker",
});

// ---- Minimal inline queue types (avoids shared package dependency) ----

interface QueueMessage {
  taskId: string;
}

interface QueueProvider {
  publish(message: QueueMessage): Promise<void>;
  consume(handler: (msg: QueueMessage) => Promise<void>): Promise<void>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

// ---- Inline MemoryQueueProvider ----

class MemoryQueueProvider implements QueueProvider {
  private emitter = new EventEmitter();
  private closed = false;

  async publish(message: QueueMessage): Promise<void> {
    setImmediate(() => this.emitter.emit("task", message));
  }

  async consume(handler: (msg: QueueMessage) => Promise<void>): Promise<void> {
    this.emitter.on("task", async (msg: QueueMessage) => {
      try {
        await handler(msg);
      } catch (err) {
        logger.error({ err }, "Handler error");
      }
    });
  }

  async ping(): Promise<void> {}
  async close(): Promise<void> {
    this.closed = true;
    this.emitter.removeAllListeners();
  }
}

// ---- Inline RedisQueueProvider ----

class RedisQueueProvider implements QueueProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private publisher: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private consumer: any;
  private consuming = false;

  constructor(private readonly redisUrl: string) {}

  private async getRedis() {
    const Redis = (await import("ioredis")).default;
    return new Redis(this.redisUrl, { lazyConnect: true });
  }

  async init() {
    this.publisher = await this.getRedis();
    this.consumer = await this.getRedis();
  }

  async publish(message: QueueMessage): Promise<void> {
    await this.publisher.xadd("tasks:stream", "*", "taskId", message.taskId);
  }

  async consume(handler: (msg: QueueMessage) => Promise<void>): Promise<void> {
    try {
      await this.consumer.xgroup(
        "CREATE",
        "tasks:stream",
        "workers",
        "$",
        "MKSTREAM"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("BUSYGROUP")) throw err;
    }

    this.consuming = true;
    const consumerName = `worker-${process.pid}`;

    const poll = async () => {
      while (this.consuming) {
        try {
          const results = await this.consumer.xreadgroup(
            "GROUP",
            "workers",
            consumerName,
            "COUNT",
            10,
            "BLOCK",
            2000,
            "STREAMS",
            "tasks:stream",
            ">"
          );
          if (!results) continue;

          for (const [, entries] of results as [string, [string, string[]][]][]) {
            for (const [entryId, fields] of entries) {
              const idx = fields.indexOf("taskId");
              if (idx === -1) continue;
              const taskId = fields[idx + 1];
              try {
                await handler({ taskId });
                await this.consumer.xack("tasks:stream", "workers", entryId);
              } catch (err) {
                logger.error({ err, taskId }, "Handler error");
              }
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (this.consuming && !msg.includes("Connection is closed")) {
            logger.error({ err }, "Redis consume loop error");
          }
          if (this.consuming) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    };

    poll();
  }

  async ping(): Promise<void> {
    const pong = await this.publisher.ping();
    if (pong !== "PONG") throw new Error("Redis ping failed");
  }

  async close(): Promise<void> {
    this.consuming = false;
    await this.publisher?.quit();
    await this.consumer?.quit();
  }
}

// ---- Task processing ----

function simulateWork(): Promise<string> {
  const durationMs = 3000 + Math.random() * 2000; // 3-5 seconds
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        `Task processed successfully in ${Math.round(durationMs)}ms at ${new Date().toISOString()}`
      );
    }, durationMs);
  });
}

// ---- TaskWorker ----

export class TaskWorker {
  private pool: Pool;
  private queue: QueueProvider;
  private running = false;

  constructor() {
    this.pool = new Pool({ connectionString: config.DATABASE_URL });

    if (config.QUEUE_PROVIDER === "redis") {
      if (!config.REDIS_URL) {
        throw new Error("REDIS_URL is required when QUEUE_PROVIDER=redis");
      }
      this.queue = new RedisQueueProvider(config.REDIS_URL);
    } else {
      this.queue = new MemoryQueueProvider();
    }
  }

  async start(): Promise<void> {
    // For Redis, initialize connections
    if (this.queue instanceof RedisQueueProvider) {
      await (this.queue as RedisQueueProvider).init();
    }

    this.running = true;
    logger.info(
      { queueProvider: config.QUEUE_PROVIDER },
      "Worker starting, listening for tasks..."
    );

    await this.queue.consume(async (msg) => {
      await this.processTask(msg.taskId);
    });
  }

  private async processTask(taskId: string): Promise<void> {
    logger.info({ taskId }, "Processing task");

    try {
      // Mark as processing
      await this.pool.query(
        `UPDATE tasks SET status = 'processing', updated_at = now() WHERE id = $1`,
        [taskId]
      );

      // Simulate work
      const result = await simulateWork();

      // Mark as completed
      await this.pool.query(
        `UPDATE tasks SET status = 'completed', result = $2, updated_at = now() WHERE id = $1`,
        [taskId, result]
      );

      logger.info({ taskId }, "Task completed successfully");
    } catch (err) {
      logger.error({ err, taskId }, "Task processing failed");

      try {
        await this.pool.query(
          `UPDATE tasks SET status = 'failed', result = $2, updated_at = now() WHERE id = $1`,
          [taskId, `Processing failed: ${err instanceof Error ? err.message : String(err)}`]
        );
      } catch (dbErr) {
        logger.error({ err: dbErr, taskId }, "Failed to mark task as failed");
      }
    }
  }

  async stop(): Promise<void> {
    logger.info("Worker shutting down...");
    this.running = false;
    await this.queue.close();
    await this.pool.end();
    logger.info("Worker stopped.");
  }
}
