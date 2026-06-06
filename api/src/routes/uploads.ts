import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { mkdir, readFile, writeFile } from "fs/promises";
import { basename, dirname, join, resolve } from "path";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";
import { requireAuth } from "../middleware/auth";
import { getStorageProvider } from "../storage/factory";

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

const localUploadParamsSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9._-]+$/, "Invalid upload key"),
});

function normalizeUploadBody(body: unknown): Buffer | null {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === "string") {
    return Buffer.from(body);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  return null;
}

function getLocalFilePath(key: string): string {
  const uploadsRoot = resolve(config.LOCAL_STORAGE_PATH);
  const filePath = resolve(join(uploadsRoot, basename(key)));

  if (dirname(filePath) !== uploadsRoot) {
    throw new Error("Invalid upload path");
  }

  return filePath;
}

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/uploads/presign
  app.post<{ Body: unknown }>(
    "/uploads/presign",
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = presignSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation error",
          details: parsed.error.flatten(),
        });
      }

      const { filename, contentType } = parsed.data;

      // Generate a unique key to avoid filename collisions
      const ext = filename.includes(".") ? filename.split(".").pop() : "";
      const key = ext ? `${uuidv4()}.${ext}` : uuidv4();

      try {
        const storage = getStorageProvider();
        const result = await storage.presign(key, contentType);
        return reply.send(result);
      } catch (err) {
        app.log.error(err, "Failed to generate presigned URL");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  app.put<{ Params: { key: string }; Body: unknown }>(
    "/uploads/:key",
    async (req, reply) => {
      if (config.STORAGE_PROVIDER !== "local") {
        return reply.status(404).send({ error: "Upload route not available" });
      }

      const parsed = localUploadParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation error",
          details: parsed.error.flatten(),
        });
      }

      const fileContents = normalizeUploadBody(req.body);
      if (!fileContents) {
        return reply.status(400).send({ error: "Expected a binary request body" });
      }

      try {
        const filePath = getLocalFilePath(parsed.data.key);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, fileContents);
        return reply.status(204).send();
      } catch (err) {
        app.log.error(err, "Failed to store local upload");
        return reply.status(500).send({ error: "Failed to store file" });
      }
    }
  );

  app.get<{ Params: { key: string } }>(
    "/uploads/:key",
    async (req, reply) => {
      if (config.STORAGE_PROVIDER !== "local") {
        return reply.status(404).send({ error: "Upload route not available" });
      }

      const parsed = localUploadParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation error",
          details: parsed.error.flatten(),
        });
      }

      try {
        const filePath = getLocalFilePath(parsed.data.key);
        const file = await readFile(filePath);
        return reply.type("application/octet-stream").send(file);
      } catch (err) {
        app.log.error(err, "Failed to read local upload");
        return reply.status(404).send({ error: "File not found" });
      }
    }
  );
}
