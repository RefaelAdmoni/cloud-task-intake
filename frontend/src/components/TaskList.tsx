import { useNavigate } from "react-router-dom";
import { Task } from "../api/tasks";
import StatusBadge from "./StatusBadge";
import { formatRelative } from "../utils/time";

interface TaskListProps {
  tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
  const navigate = useNavigate();

  if (tasks.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="task-card"
          role="link"
          tabIndex={0}
          onClick={() => navigate(`/tasks/${task.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") navigate(`/tasks/${task.id}`);
          }}
        >
          <div className="task-card-main">
            <div className="task-card-title">{task.title}</div>
            {task.description && (
              <div className="task-card-desc">{task.description}</div>
            )}
          </div>
          <div className="task-card-meta">
            <span className="task-card-time">
              {formatRelative(task.created_at)}
            </span>
            <StatusBadge status={task.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
