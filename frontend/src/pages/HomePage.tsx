import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTasks, Task } from "../api/tasks";
import TaskList from "../components/TaskList";

const REFRESH_INTERVAL_MS = 5000;

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

function computeStats(tasks: Task[]): Stats {
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter(
      (t) => t.status === "queued" || t.status === "processing"
    ).length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };
}

function SkeletonCard() {
  return (
    <div
      className="card"
      style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px" }}
    >
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: "14px", width: "60%", marginBottom: "8px" }} />
        <div className="skeleton" style={{ height: "11px", width: "40%" }} />
      </div>
      <div className="skeleton" style={{ height: "22px", width: "72px", borderRadius: "20px" }} />
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async (isInitial = false) => {
    if (!isInitial) setRefreshing(true);
    try {
      const data = await fetchTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks(true);
    const interval = setInterval(() => loadTasks(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const stats = computeStats(tasks);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-muted)",
              marginTop: "2px",
            }}
          >
            Task overview
            {refreshing && (
              <span style={{ marginLeft: "8px", color: "var(--color-primary)" }}>
                Refreshing...
              </span>
            )}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/tasks/new")}
        >
          + New Task
        </button>
      </div>

      <div className="page-body">
        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value">{loading ? "—" : stats.total}</div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{loading ? "—" : stats.pending}</div>
          </div>
          <div className="stat-card stat-primary">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{loading ? "—" : stats.inProgress}</div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{loading ? "—" : stats.completed}</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" role="alert">
            <span>Error: {error}</span>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => loadTasks(true)}
              style={{ marginLeft: "auto" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Task list section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            Recent Tasks
          </h2>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : tasks.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-title">No tasks yet</div>
              <p className="empty-state-desc">
                Get started by creating your first task.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/tasks/new")}
              >
                Create your first task
              </button>
            </div>
          </div>
        ) : (
          <TaskList tasks={tasks} />
        )}
      </div>
    </>
  );
}
