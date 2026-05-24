import Redis from "ioredis";
import { QueueMessage, QueueProvider } from "./types";

const STREAM_KEY = "tasks:stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = `worker-${process.pid}`;
const BLOCK_MS = 2000;
const BATCH_SIZE = 10;

/**
 * Redis Streams-based queue provider.
 * Uses XADD to publish and XREADGROUP to consume with consumer groups.
 */
export class RedisQueueProvider implements QueueProvider {
  private publisher: Redis;
  private consumer: Redis;
  private consuming: boolean = false;

  constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl, { lazyConnect: true });
    this.consumer = new Redis(redisUrl, { lazyConnect: true });
  }

  async publish(message: QueueMessage): Promise<void> {
    await this.publisher.xadd(STREAM_KEY, "*", "taskId", message.taskId);
  }

  async consume(
    handler: (msg: QueueMessage) => Promise<void>
  ): Promise<void> {
    // Create the consumer group, ignore error if it already exists
    try {
      await this.consumer.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "$", "MKSTREAM");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("BUSYGROUP")) {
        throw err;
      }
    }

    this.consuming = true;

    const poll = async () => {
      while (this.consuming) {
        try {
          const results = await this.consumer.xreadgroup(
            "GROUP",
            GROUP_NAME,
            CONSUMER_NAME,
            "COUNT",
            BATCH_SIZE,
            "BLOCK",
            BLOCK_MS,
            "STREAMS",
            STREAM_KEY,
            ">"
          );

          if (!results) continue;

          for (const [, entries] of results as [string, [string, string[]][]][]) {
            for (const [entryId, fields] of entries) {
              const taskIdIndex = fields.indexOf("taskId");
              if (taskIdIndex === -1) continue;

              const taskId = fields[taskIdIndex + 1];
              try {
                await handler({ taskId });
                await this.consumer.xack(STREAM_KEY, GROUP_NAME, entryId);
              } catch (err) {
                console.error(`[RedisQueue] Handler failed for entry ${entryId}:`, err);
                // Message stays unacknowledged for retry by a pending-entries sweep
              }
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          if (this.consuming && !message.includes("Connection is closed")) {
            console.error("[RedisQueue] consume loop error:", err);
          }
          if (this.consuming) {
            // Brief pause before retrying to avoid tight error loops
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    };

    // Run in background — do not await
    poll();
  }

  async ping(): Promise<void> {
    const pong = await this.publisher.ping();
    if (pong !== "PONG") {
      throw new Error("Redis ping failed");
    }
  }

  async close(): Promise<void> {
    this.consuming = false;
    await this.publisher.quit();
    await this.consumer.quit();
  }
}
