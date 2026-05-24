# Cloud Task Intake

A full-stack task management application demonstrating a cloud-portable architecture with pluggable queue and storage backends.

## Overview

Users submit tasks (with optional file attachments) through a React frontend. The backend API stores tasks in PostgreSQL and publishes processing jobs to a queue. A background worker consumes jobs and simulates processing (3–5 seconds), then updates the task status and result.

The queue and storage layers are abstracted so the application can run on any cloud or locally — see [docs/cloud-deployment-notes.md](docs/cloud-deployment-notes.md).

## Services

| Service    | Port | Description                                                                     |
|------------|------|---------------------------------------------------------------------------------|
| `api`      | 3000 | Fastify REST API + DB + queue                                                   |
| `worker`   | —    | Background job processor                                                        |
| `frontend` | 5173 | React + Vite SPA                                                                |
| `postgres` | 5432 | PostgreSQL 16 (local only — use a managed database in production)               |
| `redis`    | 6379 | Redis 7 (local queue substitute — replaced by a managed queue in production)    |

## Quick Start (Docker Compose)

```bash
# Clone and enter the project
git clone https://github.com/ictbit-labs/cloud-task-intake.git
cd cloud-task-intake

# Start all services
docker compose up --build

# Open the app
open http://localhost:5173
```

The API will be available at `http://localhost:3000`.

## Authentication

The app uses JWT-based authentication. All `/api/*` routes require a `Bearer` token.

Default development credentials:

| Field    | Value               |
|----------|---------------------|
| Email    | `admin@example.com` |
| Password | `admin123`          |

The `JWT_SECRET` environment variable must be at least 32 characters. A default is provided in `docker-compose.yml` for local development — **change it before deploying to any shared environment**.

## Local Development (without Docker)

### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally
- Redis 7 running locally (optional — use `QUEUE_PROVIDER=memory` to skip)

### Setup

```bash
# 1. Copy and edit environment variables
cp .env.example .env
# Edit .env: set DATABASE_URL, REDIS_URL, and JWT_SECRET

# 2. Install API dependencies and run migrations + seed
cd api
npm install
npm run migrate
npm run seed    # creates sample tasks and the default admin user
npm run dev     # starts on port 3000

# 3. In a separate terminal, start the worker
cd worker
npm install
npm run dev

# 4. In a separate terminal, start the frontend
cd frontend
npm install
npm run dev     # starts on port 5173
```

Open `http://localhost:5173` and sign in with `admin@example.com` / `admin123`.

### Running tests

```bash
cd api
npm test
```

## Project Structure

```
cloud-task-intake/
├── api/               Node.js + TypeScript + Fastify REST API
│   └── src/
│       ├── routes/    HTTP route handlers (health, tasks, uploads, auth)
│       ├── middleware/ Auth middleware (JWT verification)
│       ├── db/        PostgreSQL client, migrations, repository, seed
│       ├── queue/     Queue provider abstraction (memory, Redis, SQS, ASB, Pub/Sub)
│       └── storage/   Storage provider abstraction (local, S3, Azure Blob, GCS)
├── worker/            Background task processor
├── frontend/          React + Vite SPA
└── docs/              Architecture, environment, cloud deployment notes
```

## Environment Variables

See [docs/environment.md](docs/environment.md) for the full reference.

## Documentation

- [Architecture](docs/architecture.md) — service diagram and data flow
- [Environment Variables](docs/environment.md) — complete variable reference
- [Cloud Deployment Notes](docs/cloud-deployment-notes.md) — cloud provider mapping
- [DevOps Assignment](docs/devops-candidate-assignment.md) — candidate instructions

## API Reference

### Public

| Method | Path                  | Description        |
|--------|-----------------------|--------------------|
| GET    | /health               | Liveness probe     |
| GET    | /ready                | Readiness probe    |
| POST   | /api/auth/login       | Obtain JWT token   |
| GET    | /api/auth/me          | Get current user   |

### Protected (Bearer token required)

| Method | Path                        | Description                       |
|--------|-----------------------------|-----------------------------------|
| GET    | /api/tasks                  | List all tasks                    |
| POST   | /api/tasks                  | Create a task                     |
| GET    | /api/tasks/:id              | Get task by ID                    |
| POST   | /api/tasks/:id/process      | Enqueue task for processing       |
| POST   | /api/uploads/presign        | Get presigned upload URL          |

