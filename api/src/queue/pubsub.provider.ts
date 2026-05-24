// PLACEHOLDER - GCP Pub/Sub implementation
//
// Required env vars:
//   GCP_PROJECT_ID        — your GCP project ID
//   PUBSUB_TOPIC_ID       — topic to publish messages to
//   PUBSUB_SUBSCRIPTION_ID— subscription to consume messages from
//
// Authentication:
//   When running on GCP (Cloud Run, GKE, etc.) the default service account is used automatically.
//   Locally, set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//
// Install:
//   npm install @google-cloud/pubsub
//
// Implementation guide:
//   import { PubSub } from "@google-cloud/pubsub";
//
//   publish:
//     const pubsub = new PubSub({ projectId });
//     const topic = pubsub.topic(topicId);
//     await topic.publishMessage({ data: Buffer.from(JSON.stringify({ taskId })) });
//
//   consume:
//     const subscription = pubsub.subscription(subscriptionId);
//     subscription.on("message", async (message) => {
//       const body = JSON.parse(message.data.toString());
//       await handler(body);
//       message.ack();
//     });
//     subscription.on("error", (err) => console.error(err));
//
//   ping:
//     await pubsub.topic(topicId).getMetadata();

import { QueueMessage, QueueProvider } from "./types";

export class PubSubQueueProvider implements QueueProvider {
  constructor(
    private readonly projectId: string,
    private readonly topicId: string,
    private readonly subscriptionId: string
  ) {}

  async publish(_message: QueueMessage): Promise<void> {
    throw new Error(
      "PubSubQueueProvider is not implemented. " +
        "Install @google-cloud/pubsub and implement this class."
    );
  }

  async consume(
    _handler: (msg: QueueMessage) => Promise<void>
  ): Promise<void> {
    throw new Error(
      "PubSubQueueProvider is not implemented. " +
        "Install @google-cloud/pubsub and implement this class."
    );
  }

  async ping(): Promise<void> {
    throw new Error(
      "PubSubQueueProvider is not implemented. " +
        "Install @google-cloud/pubsub and implement this class."
    );
  }

  async close(): Promise<void> {
    // No-op until implemented
  }
}
