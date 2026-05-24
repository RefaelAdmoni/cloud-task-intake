// PLACEHOLDER - GCP Cloud Storage implementation
//
// Required env vars:
//   GCP_PROJECT_ID    — your GCP project ID
//   GCP_STORAGE_BUCKET— GCS bucket name
//
// Authentication:
//   When running on GCP the default service account is used automatically.
//   Locally, set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//
// Install:
//   npm install @google-cloud/storage
//
// Implementation guide:
//   import { Storage } from "@google-cloud/storage";
//
//   presign:
//     const storage = new Storage({ projectId });
//     const bucket = storage.bucket(bucketName);
//     const file = bucket.file(key);
//     const [uploadUrl] = await file.generateSignedPostPolicyV4({
//       expires: Date.now() + 15 * 60 * 1000, // 15 minutes
//       conditions: [["content-length-range", 0, 50 * 1024 * 1024]],
//     });
//     const fileUrl = `https://storage.googleapis.com/${bucketName}/${key}`;
//     return { uploadUrl: uploadUrl.url, fileUrl };
//
//   ping:
//     await storage.bucket(bucketName).getMetadata();

import { StorageProvider, PresignResult } from "./types";

export class GCSStorageProvider implements StorageProvider {
  constructor(
    private readonly projectId: string,
    private readonly bucketName: string
  ) {}

  async presign(_key: string, _contentType: string): Promise<PresignResult> {
    throw new Error(
      "GCSStorageProvider is not implemented. " +
        "Install @google-cloud/storage and implement this class."
    );
  }

  async ping(): Promise<void> {
    throw new Error(
      "GCSStorageProvider is not implemented. " +
        "Install @google-cloud/storage and implement this class."
    );
  }
}
