const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "queued" | "processing" | "completed" | "failed";
  file_url: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  file_url?: string | null;
}

export interface PresignResult {
  uploadUrl: string;
  fileUrl: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error) errorMessage = errorBody.error;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export async function fetchTasks(): Promise<Task[]> {
  return request<Task[]>("/api/tasks");
}

export async function fetchTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`);
}

export async function createTask(data: CreateTaskInput): Promise<Task> {
  return request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function processTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/process`, {
    method: "POST",
  });
}

export async function presignUpload(
  filename: string,
  contentType: string
): Promise<PresignResult> {
  return request<PresignResult>("/api/uploads/presign", {
    method: "POST",
    body: JSON.stringify({ filename, contentType }),
  });
}
