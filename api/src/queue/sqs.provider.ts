// PLACEHOLDER - AWS SQS implementation
//
// Required env vars:
//   AWS_REGION            — e.g. us-east-1
//   SQS_QUEUE_URL         — full URL of the SQS queue
//   AWS_ACCESS_KEY_ID     — (not needed when running on AWS with an IAM role)
//   AWS_SECRET_ACCESS_KEY — (not needed when running on AWS with an IAM role)
//
// Install:
//   npm install @aws-sdk/client-sqs
//
// Implementation guide:
//   import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
//
//   publish:
//     const client = new SQSClient({ region });
//     await client.send(new SendMessageCommand({
//       QueueUrl: queueUrl,
//       MessageBody: JSON.stringify({ taskId }),
//     }));
//
//   consume (long-polling loop):
//     while (this.running) {
//       const { Messages = [] } = await client.send(new ReceiveMessageCommand({
//         QueueUrl: queueUrl,
//         MaxNumberOfMessages: 10,
//         WaitTimeSeconds: 20,  // long poll
//       }));
//       for (const msg of Messages) {
//         const body = JSON.parse(msg.Body!);
//         await handler(body);
//         await client.send(new DeleteMessageCommand({
//           QueueUrl: queueUrl,
//           ReceiptHandle: msg.ReceiptHandle!,
//         }));
//       }
//     }
//
//   ping:
//     Use GetQueueAttributesCommand to verify the queue is accessible.

import { QueueMessage, QueueProvider } from "./types";

export class SQSQueueProvider implements QueueProvider {
  constructor(
    private readonly region: string,
    private readonly queueUrl: string
  ) {}

  async publish(_message: QueueMessage): Promise<void> {
    throw new Error(
      "SQSQueueProvider is not implemented. " +
        "Install @aws-sdk/client-sqs and implement this class."
    );
  }

  async consume(
    _handler: (msg: QueueMessage) => Promise<void>
  ): Promise<void> {
    throw new Error(
      "SQSQueueProvider is not implemented. " +
        "Install @aws-sdk/client-sqs and implement this class."
    );
  }

  async ping(): Promise<void> {
    throw new Error(
      "SQSQueueProvider is not implemented. " +
        "Install @aws-sdk/client-sqs and implement this class."
    );
  }

  async close(): Promise<void> {
    // No-op until implemented
  }
}
