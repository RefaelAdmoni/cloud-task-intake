import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getPool } from "../db/client";
import { getQueueProvider } from "../queue/factory";
import { getStorageProvider } from "../storage/factory";
import { config } from "../config";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/ready", async (_req: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, { ok: boolean; error?: string }> = {};

    // Database check
    try {
      const pool = getPool();
      await pool.query("SELECT 1");
      checks.database = { ok: true };
    } catch (err) {
      checks.database = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Queue check (only if not using in-memory provider which is always healthy)
    if (config.QUEUE_PROVIDER !== "memory") {
      try {
        const queue = getQueueProvider();
        await queue.ping();
        checks.queue = { ok: true };
      } catch (err) {
        checks.queue = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    // Storage check (only if not using local provider — local always passes)
    if (config.STORAGE_PROVIDER !== "local") {
      try {
        const storage = getStorageProvider();
        await storage.ping();
        checks.storage = { ok: true };
      } catch (err) {
        checks.storage = {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    const statusCode = allOk ? 200 : 503;

    return reply.status(statusCode).send({
      status: allOk ? "ready" : "not_ready",
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}
