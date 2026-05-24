import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getStorageProvider } from "../storage/factory";

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/uploads/presign
  app.post(
    "/uploads/presign",
    async (
      req: FastifyRequest<{ Body: unknown }>,
      reply: FastifyReply
    ) => {
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
}
