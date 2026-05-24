import { Task } from "../api/tasks";

interface StatusBadgeProps {
  status: Task["status"];
}

const STATUS_LABELS: Record<Task["status"], string> = {
  pending: "Pending",
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
