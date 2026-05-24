import { EventEmitter } from "events";
import { QueueMessage, QueueProvider } from "./types";

const TASK_EVENT = "task";

/**
 * In-process queue backed by Node.js EventEmitter.
 * Suitable for local development and single-instance deployments.
 * Messages are lost if the process restarts.
 */
export class MemoryQueueProvider implements QueueProvider {
  private emitter: EventEmitter;
  private closed: boolean = false;

  constructor() {
    this.emitter = new EventEmitter();
    // Avoid MaxListenersExceededWarning in tests
    this.emitter.setMaxListeners(50);
  }

  async publish(message: QueueMessage): Promise<void> {
    if (this.closed) {
      throw new Error("MemoryQueueProvider is closed");
    }
    // Emit asynchronously so publish() returns before handlers run
    setImmediate(() => {
      this.emitter.emit(TASK_EVENT, message);
    });
  }

  async consume(
    handler: (msg: QueueMessage) => Promise<void>
  ): Promise<void> {
    if (this.closed) {
      throw new Error("MemoryQueueProvider is closed");
    }

    this.emitter.on(TASK_EVENT, async (msg: QueueMessage) => {
      try {
        await handler(msg);
      } catch (err) {
        console.error("[MemoryQueue] Handler error:", err);
      }
    });
  }

  async ping(): Promise<void> {
    // Always healthy for in-process queue
  }

  async close(): Promise<void> {
    this.closed = true;
    this.emitter.removeAllListeners();
  }
}
