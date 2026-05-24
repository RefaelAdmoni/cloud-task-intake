import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { TaskRepository } from "../db/repository";
import { getQueueProvider } from "../queue/factory";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  file_url: z.string().url().optional().nullable(),
});

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const repo = new TaskRepository();

  // GET /api/tasks
  app.get("/tasks", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const tasks = await repo.findAll();
      return reply.send(tasks);
    } catch (err) {
      app.log.error(err, "Failed to list tasks");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // POST /api/tasks
  app.post(
    "/tasks",
    async (
      req: FastifyRequest<{ Body: unknown }>,
      reply: FastifyReply
    ) => {
      const parsed = createTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation error",
          details: parsed.error.flatten(),
        });
      }

      try {
        const task = await repo.create(parsed.data);
        return reply.status(201).send(task);
      } catch (err) {
        app.log.error(err, "Failed to create task");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // GET /api/tasks/:id
  app.get(
    "/tasks/:id",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      try {
        const task = await repo.findById(id);
        if (!task) {
          return reply.status(404).send({ error: "Task not found" });
        }
        return reply.send(task);
      } catch (err) {
        app.log.error(err, "Failed to get task");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // POST /api/tasks/:id/process
  app.post(
    "/tasks/:id/process",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      try {
        const task = await repo.findById(id);
        if (!task) {
          return reply.status(404).send({ error: "Task not found" });
        }

        if (task.status !== "pending") {
          return reply.status(409).send({
            error: `Task cannot be queued: current status is '${task.status}'`,
          });
        }

        const updated = await repo.updateStatus(id, "queued");

        const queue = getQueueProvider();
        await queue.publish({ taskId: id });

        app.log.info({ taskId: id }, "Task queued for processing");
        return reply.send(updated);
      } catch (err) {
        app.log.error(err, "Failed to enqueue task");
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
}
