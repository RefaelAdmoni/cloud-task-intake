import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createTask, presignUpload } from "../api/tasks";

const TITLE_MAX = 255;

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const validate = (): boolean => {
    let ok = true;
    if (!title.trim()) {
      setTitleError("Title is required.");
      ok = false;
    } else {
      setTitleError(null);
    }
    if (!description.trim()) {
      setDescError("Description is required.");
      ok = false;
    } else {
      setDescError(null);
    }
    return ok;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      let fileUrl: string | null = null;

      if (file) {
        const presign = await presignUpload(
          file.name,
          file.type || "application/octet-stream"
        );
        fileUrl = presign.fileUrl;

        try {
          await fetch(presign.uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });
        } catch {
          console.warn("File upload to presigned URL failed (expected in local dev)");
        }
      }

      const task = await createTask({
        title: title.trim(),
        description: description.trim(),
        file_url: fileUrl,
      });

      setSuccess(true);

      // Navigate after brief confirmation delay
      setTimeout(() => {
        navigate(`/tasks/${task.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  // Clear field-level error on change
  useEffect(() => {
    if (title.trim()) setTitleError(null);
  }, [title]);

  useEffect(() => {
    if (description.trim()) setDescError(null);
  }, [description]);

  const titleChars = title.length;
  const charCounterClass =
    titleChars >= TITLE_MAX
      ? "char-counter at-limit"
      : titleChars >= TITLE_MAX * 0.85
      ? "char-counter near-limit"
      : "char-counter";

  return (
    <>
      <div className="page-header">
        <h1>Create New Task</h1>
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: "640px" }}>
          <div className="card-body">
            {success && (
              <div className="alert alert-success" role="status">
                Task created successfully! Redirecting...
              </div>
            )}

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Title */}
              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  Title <span className="required">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Provision cloud database"
                  maxLength={TITLE_MAX}
                  disabled={submitting || success}
                />
                <div className="flex justify-between mt-1">
                  <span className="form-error">{titleError ?? ""}</span>
                  <span className={charCounterClass}>
                    {titleChars}/{TITLE_MAX}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  id="description"
                  className="form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the task in detail..."
                  rows={5}
                  disabled={submitting || success}
                />
                {descError && (
                  <span className="form-error">{descError}</span>
                )}
              </div>

              {/* File */}
              <div className="form-group">
                <label className="form-label">
                  Attachment <span className="optional">(optional)</span>
                </label>
                <div className="file-input-wrapper">
                  <label
                    htmlFor="file"
                    className={`file-input-label${file ? " has-file" : ""}`}
                  >
                    <span>{file ? "📎" : "📁"}</span>
                    <span>
                      {file
                        ? `${file.name} (${Math.round(file.size / 1024)} KB)`
                        : "Click to choose a file"}
                    </span>
                  </label>
                  <input
                    id="file"
                    type="file"
                    className="file-input-hidden"
                    onChange={handleFileChange}
                    disabled={submitting || success}
                    style={{ height: "100%" }}
                  />
                </div>
                <p className="form-hint">Max file size: 50 MB</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || success}
                >
                  {submitting ? (
                    <>
                      <span className="loading-spinner" />
                      Creating...
                    </>
                  ) : (
                    "Create Task"
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/")}
                  disabled={submitting || success}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
