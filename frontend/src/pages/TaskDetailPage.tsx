import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTask, processTask, Task } from "../api/tasks";
import StatusBadge from "../components/StatusBadge";

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES: Task["status"][] = ["queued", "processing"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <dt
        style={{
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "4px",
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: "0.95rem", color: "#222" }}>
        {children}
      </dd>
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchTask(id);
      setTask(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Poll while task is in an active state
  useEffect(() => {
    if (!task) return;
    if (!ACTIVE_STATUSES.includes(task.status)) return;

    const interval = setInterval(loadTask, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [task, loadTask]);

  const handleProcess = async () => {
    if (!task) return;
    setProcessing(true);
    setError(null);
    try {
      const updated = await processTask(task.id);
      setTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enqueue task");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: "#999" }}>
        Loading task...
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: "#999" }}>
        Task not found.
      </div>
    );
  }

  const isActive = ACTIVE_STATUSES.includes(task.status);

  return (
    <div style={{ maxWidth: "700px" }}>
      <button
        onClick={() => navigate("/")}
        style={{
          background: "none",
          border: "none",
          color: "#1d4ed8",
          cursor: "pointer",
          padding: 0,
          fontSize: "0.9rem",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        &larr; Back to Tasks
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "24px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#111",
            lineHeight: 1.3,
          }}
        >
          {task.title}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <StatusBadge status={task.status} />
          {isActive && (
            <span style={{ fontSize: "0.8rem", color: "#888" }}>
              Polling every {POLL_INTERVAL_MS / 1000}s...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "20px",
        }}
      >
        <dl>
          <Field label="Description">{task.description}</Field>
          <Field label="Status">
            <StatusBadge status={task.status} />
          </Field>
          {task.file_url && (
            <Field label="Attachment">
              <a
                href={task.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1d4ed8", wordBreak: "break-all" }}
              >
                {task.file_url}
              </a>
            </Field>
          )}
          {task.result && (
            <Field label="Result">
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "12px",
                  borderRadius: "4px",
                  fontSize: "0.85rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {task.result}
              </pre>
            </Field>
          )}
          <Field label="Task ID">
            <code style={{ fontSize: "0.85rem", color: "#666" }}>{task.id}</code>
          </Field>
          <Field label="Created">{formatDate(task.created_at)}</Field>
          <Field label="Last Updated">{formatDate(task.updated_at)}</Field>
        </dl>
      </div>

      {task.status === "pending" && (
        <button
          onClick={handleProcess}
          disabled={processing}
          style={{
            background: processing ? "#888" : "#16a34a",
            color: "#fff",
            border: "none",
            padding: "12px 28px",
            borderRadius: "6px",
            cursor: processing ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          {processing ? "Queuing..." : "Process Task"}
        </button>
      )}
    </div>
  );
}
