import { StorageProvider, PresignResult } from "./types";

/**
 * Local filesystem storage provider for development.
 * Returns a URL pointing to the backend's /api/uploads/:key endpoint.
 * The actual file upload must be handled by a multipart endpoint in the API.
 */
export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly storagePath: string
  ) {}

  async presign(key: string, _contentType: string): Promise<PresignResult> {
    const uploadUrl = `${this.baseUrl}/${key}`;
    const fileUrl = `${this.baseUrl}/${key}`;
    return { uploadUrl, fileUrl };
  }

  async ping(): Promise<void> {
    // Local storage is always available if the path is accessible.
    // We do a lightweight check by importing fs and checking the path exists.
    const { existsSync, mkdirSync } = await import("fs");
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }
}
