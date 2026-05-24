// PLACEHOLDER - Azure Service Bus implementation
//
// Required env vars:
//   AZURE_SERVICE_BUS_CONNECTION_STRING  — connection string from Azure Portal
//   AZURE_SERVICE_BUS_QUEUE_NAME        — name of the Service Bus queue
//
// Install:
//   npm install @azure/service-bus
//
// Implementation guide:
//   import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
//
//   publish:
//     const client = new ServiceBusClient(connectionString);
//     const sender = client.createSender(queueName);
//     await sender.sendMessages({ body: { taskId } });
//     await sender.close();
//
//   consume:
//     const receiver = client.createReceiver(queueName);
//     receiver.subscribe({
//       processMessage: async (msg) => {
//         await handler(msg.body as QueueMessage);
//         await receiver.completeMessage(msg);
//       },
//       processError: async (err) => { console.error(err); }
//     });
//
//   ping:
//     Try to peek a message; if it throws, the connection is unhealthy.

import { QueueMessage, QueueProvider } from "./types";

export class AzureServiceBusQueueProvider implements QueueProvider {
  constructor(
    private readonly connectionString: string,
    private readonly queueName: string
  ) {}

  async publish(_message: QueueMessage): Promise<void> {
    throw new Error(
      "AzureServiceBusQueueProvider is not implemented. " +
        "Install @azure/service-bus and implement this class."
    );
  }

  async consume(
    _handler: (msg: QueueMessage) => Promise<void>
  ): Promise<void> {
    throw new Error(
      "AzureServiceBusQueueProvider is not implemented. " +
        "Install @azure/service-bus and implement this class."
    );
  }

  async ping(): Promise<void> {
    throw new Error(
      "AzureServiceBusQueueProvider is not implemented. " +
        "Install @azure/service-bus and implement this class."
    );
  }

  async close(): Promise<void> {
    // No-op until implemented
  }
}
