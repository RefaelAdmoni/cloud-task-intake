import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Queue
  QUEUE_PROVIDER: z
    .enum(["memory", "redis", "azure-service-bus", "sqs", "pubsub"])
    .default("memory"),
  REDIS_URL: z.string().optional(),

  // Azure Service Bus
  AZURE_SERVICE_BUS_CONNECTION_STRING: z.string().optional(),
  AZURE_SERVICE_BUS_QUEUE_NAME: z.string().optional(),

  // SQS
  AWS_REGION: z.string().optional(),
  SQS_QUEUE_URL: z.string().optional(),

  // GCP Pub/Sub
  GCP_PROJECT_ID: z.string().optional(),
  PUBSUB_TOPIC_ID: z.string().optional(),
  PUBSUB_SUBSCRIPTION_ID: z.string().optional(),
});

export type WorkerConfig = z.infer<typeof envSchema>;

function loadConfig(): WorkerConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error(
      "[worker] Configuration validation failed:",
      JSON.stringify(formatted, null, 2)
    );
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
