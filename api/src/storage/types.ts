export interface PresignResult {
  uploadUrl: string;
  fileUrl: string;
}

export interface StorageProvider {
  presign(key: string, contentType: string): Promise<PresignResult>;
  ping(): Promise<void>;
}

export type StorageProviderName = "local" | "azure-blob" | "s3" | "gcs";
