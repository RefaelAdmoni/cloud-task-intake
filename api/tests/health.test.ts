import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock config before importing app modules
vi.mock("../src/config", () => ({
  config: {
    NODE_ENV: "test",
    PORT: 3000,
    DATABASE_URL: "postgresql://test:test@localhost:5432/testdb",
    CORS_ORIGIN: "http://localhost:5173",
    QUEUE_PROVIDER: "memory",
    STORAGE_PROVIDER: "local",
    LOCAL_STORAGE_PATH: "/tmp/test-uploads",
    PUBLIC_STORAGE_BASE_URL: "http://localhost:3000/uploads",
  },
}));

// Mock DB client to avoid real DB connections
vi.mock("../src/db/client", () => ({
  getPool: () => ({
    query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
    on: vi.fn(),
    end: vi.fn(),
  }),
  closePool: vi.fn(),
}));

// Mock migrate to be a no-op
vi.mock("../src/db/migrate", () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}));

import { buildApp } from "../src/app";
import { FastifyInstance } from "fastify";

describe("Health Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("returns 200 with status ok", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe("string");
    });
  });

  describe("GET /ready", () => {
    it("returns 200 when database is reachable", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/ready",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("ready");
      expect(body.checks.database.ok).toBe(true);
      expect(body.timestamp).toBeDefined();
    });

    it("returns valid JSON structure with checks field", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/ready",
      });

      const body = response.json();
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("checks");
      expect(body).toHaveProperty("timestamp");
      expect(typeof body.checks).toBe("object");
    });
  });
});
