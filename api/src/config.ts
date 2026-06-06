import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Queue
  QUEUE_PROVIDER: z
    .enum(["memory", "redis", "azure-service-bus", "sqs", "pubsub"])
    .default("memory"),
  REDIS_URL: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z
    .enum(["local", "azure-blob", "s3", "gcs"])
    .default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./uploads"),
  PUBLIC_STORAGE_BASE_URL: z
    .string()
    .default("http://localhost:3000/api/uploads"),

  // Azure Storage
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional(),
  AZURE_STORAGE_CONTAINER_NAME: z.string().optional(),
  AZURE_STORAGE_SAS_TOKEN: z.string().optional(),

  // AWS S3
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // GCP Storage
  GCP_PROJECT_ID: z.string().optional(),
  GCP_STORAGE_BUCKET: z.string().optional(),

  // Azure Service Bus
  AZURE_SERVICE_BUS_CONNECTION_STRING: z.string().optional(),
  AZURE_SERVICE_BUS_QUEUE_NAME: z.string().optional(),

  // SQS
  SQS_QUEUE_URL: z.string().optional(),

  // GCP Pub/Sub
  PUBSUB_TOPIC_ID: z.string().optional(),
  PUBSUB_SUBSCRIPTION_ID: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("24h"),
});

export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error("Configuration validation failed:", JSON.stringify(formatted, null, 2));
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
