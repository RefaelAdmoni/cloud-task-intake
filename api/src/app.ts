import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { config } from "./config";
import { healthRoutes } from "./routes/health";
import { taskRoutes } from "./routes/tasks";
import { uploadRoutes } from "./routes/uploads";
import { authRoutes } from "./routes/auth";
import { requireAuth } from "./middleware/auth";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "test" ? "silent" : "info",
      ...(config.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }
        : {}),
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50 MB
    },
  });

  // Public routes
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: "/api" });

  // Protected routes — apply requireAuth as a scoped hook
  await app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", requireAuth);
    await protectedApp.register(taskRoutes, { prefix: "/api" });
    await protectedApp.register(uploadRoutes, { prefix: "/api" });
  });

  return app;
}
