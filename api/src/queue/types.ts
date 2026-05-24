export interface QueueMessage {
  taskId: string;
}

export interface QueueProvider {
  publish(message: QueueMessage): Promise<void>;
  consume(handler: (msg: QueueMessage) => Promise<void>): Promise<void>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export type QueueProviderName =
  | "memory"
  | "redis"
  | "azure-service-bus"
  | "sqs"
  | "pubsub";
