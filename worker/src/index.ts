import { TaskWorker } from "./worker";

const worker = new TaskWorker();

async function main() {
  await worker.start();
}

async function shutdown(signal: string) {
  console.log(`[worker] Received ${signal}, shutting down...`);
  try {
    await worker.stop();
    process.exit(0);
  } catch (err) {
    console.error("[worker] Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  console.error("[worker] Fatal startup error:", err);
  process.exit(1);
});
