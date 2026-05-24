import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { getPool } from "./client";
import { runMigrations } from "./migrate";

const SEED_TASKS = [
  {
    title: "Provision cloud database",
    description:
      "Set up a managed PostgreSQL instance on the target cloud provider with proper security groups and backups enabled.",
  },
  {
    title: "Configure CI/CD pipeline",
    description:
      "Create a GitHub Actions workflow that builds Docker images, pushes to a container registry, and deploys to the target environment.",
  },
  {
    title: "Set up monitoring and alerting",
    description:
      "Install Prometheus and Grafana. Configure alerts for high CPU usage, memory pressure, and HTTP error rates.",
  },
];

async function seed(): Promise<void> {
  await runMigrations();
  const pool = getPool();

  console.log("[seed] Inserting seed tasks...");

  for (const task of SEED_TASKS) {
    await pool.query(
      `INSERT INTO tasks (id, title, description, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (id) DO NOTHING`,
      [uuidv4(), task.title, task.description]
    );
  }

  console.log(`[seed] Inserted ${SEED_TASKS.length} seed tasks.`);

  console.log("[seed] Inserting default admin user...");

  const passwordHash = await bcrypt.hash("admin123", 10);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [uuidv4(), "admin@example.com", passwordHash]
  );

  console.log("[seed] Admin user ready (email: admin@example.com).");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] Error:", err);
    process.exit(1);
  });
