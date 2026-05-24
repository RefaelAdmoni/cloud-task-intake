import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "./client";

export type TaskStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  file_url: string | null;
  result: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  file_url?: string | null;
}

export class TaskRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  async findAll(): Promise<Task[]> {
    const { rows } = await this.pool.query<Task>(
      `SELECT id, title, description, status, file_url, result, created_at, updated_at
       FROM tasks
       ORDER BY created_at DESC`
    );
    return rows;
  }

  async findById(id: string): Promise<Task | null> {
    const { rows } = await this.pool.query<Task>(
      `SELECT id, title, description, status, file_url, result, created_at, updated_at
       FROM tasks
       WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const id = uuidv4();
    const { rows } = await this.pool.query<Task>(
      `INSERT INTO tasks (id, title, description, status, file_url)
       VALUES ($1, $2, $3, 'pending', $4)
       RETURNING id, title, description, status, file_url, result, created_at, updated_at`,
      [id, input.title, input.description, input.file_url ?? null]
    );
    return rows[0];
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task | null> {
    const { rows } = await this.pool.query<Task>(
      `UPDATE tasks
       SET status = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, title, description, status, file_url, result, created_at, updated_at`,
      [id, status]
    );
    return rows[0] ?? null;
  }

  async updateResult(
    id: string,
    result: string,
    status: TaskStatus
  ): Promise<Task | null> {
    const { rows } = await this.pool.query<Task>(
      `UPDATE tasks
       SET result = $2, status = $3, updated_at = now()
       WHERE id = $1
       RETURNING id, title, description, status, file_url, result, created_at, updated_at`,
      [id, result, status]
    );
    return rows[0] ?? null;
  }
}
