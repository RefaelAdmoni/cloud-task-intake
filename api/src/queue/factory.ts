import { config } from "../config";
import { QueueProvider, QueueProviderName } from "./types";
import { MemoryQueueProvider } from "./memory.provider";
import { RedisQueueProvider } from "./redis.provider";
import { AzureServiceBusQueueProvider } from "./azure-service-bus.provider";
import { SQSQueueProvider } from "./sqs.provider";
import { PubSubQueueProvider } from "./pubsub.provider";

let instance: QueueProvider | null = null;

export function createQueueProvider(
  name?: QueueProviderName
): QueueProvider {
  const providerName = name ?? (config.QUEUE_PROVIDER as QueueProviderName);

  switch (providerName) {
    case "memory":
      return new MemoryQueueProvider();

    case "redis": {
      const redisUrl = config.REDIS_URL;
      if (!redisUrl) {
        throw new Error("REDIS_URL is required when QUEUE_PROVIDER=redis");
      }
      return new RedisQueueProvider(redisUrl);
    }

    case "azure-service-bus": {
      const connStr = config.AZURE_SERVICE_BUS_CONNECTION_STRING;
      const queueName = config.AZURE_SERVICE_BUS_QUEUE_NAME;
      if (!connStr || !queueName) {
        throw new Error(
          "AZURE_SERVICE_BUS_CONNECTION_STRING and AZURE_SERVICE_BUS_QUEUE_NAME are required " +
            "when QUEUE_PROVIDER=azure-service-bus"
        );
      }
      return new AzureServiceBusQueueProvider(connStr, queueName);
    }

    case "sqs": {
      const region = config.AWS_REGION;
      const queueUrl = config.SQS_QUEUE_URL;
      if (!region || !queueUrl) {
        throw new Error(
          "AWS_REGION and SQS_QUEUE_URL are required when QUEUE_PROVIDER=sqs"
        );
      }
      return new SQSQueueProvider(region, queueUrl);
    }

    case "pubsub": {
      const projectId = config.GCP_PROJECT_ID;
      const topicId = config.PUBSUB_TOPIC_ID;
      const subscriptionId = config.PUBSUB_SUBSCRIPTION_ID;
      if (!projectId || !topicId || !subscriptionId) {
        throw new Error(
          "GCP_PROJECT_ID, PUBSUB_TOPIC_ID, and PUBSUB_SUBSCRIPTION_ID are required " +
            "when QUEUE_PROVIDER=pubsub"
        );
      }
      return new PubSubQueueProvider(projectId, topicId, subscriptionId);
    }

    default: {
      const _exhaustive: never = providerName;
      throw new Error(`Unknown QUEUE_PROVIDER: ${_exhaustive}`);
    }
  }
}

/** Returns a lazily-created singleton queue provider for the API process. */
export function getQueueProvider(): QueueProvider {
  if (!instance) {
    instance = createQueueProvider();
  }
  return instance;
}
