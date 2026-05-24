// PLACEHOLDER - Azure Blob Storage implementation
//
// Required env vars:
//   AZURE_STORAGE_ACCOUNT_NAME  — storage account name
//   AZURE_STORAGE_CONTAINER_NAME— blob container name
//   AZURE_STORAGE_SAS_TOKEN     — SAS token with read+write permissions on the container
//
// Install:
//   npm install @azure/storage-blob
//
// Implementation guide:
//   import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from "@azure/storage-blob";
//
//   presign:
//     Build a SAS URL for the blob key with write permissions, expiring in 15 minutes.
//     const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${key}?${sasToken}`;
//     Return { uploadUrl: sasUrl, fileUrl: publicBlobUrl }.
//
//   ping:
//     const client = BlobServiceClient.fromConnectionString(connStr);
//     await client.getProperties();

import { StorageProvider, PresignResult } from "./types";

export class AzureBlobStorageProvider implements StorageProvider {
  constructor(
    private readonly accountName: string,
    private readonly containerName: string,
    private readonly sasToken: string
  ) {}

  async presign(_key: string, _contentType: string): Promise<PresignResult> {
    throw new Error(
      "AzureBlobStorageProvider is not implemented. " +
        "Install @azure/storage-blob and implement this class."
    );
  }

  async ping(): Promise<void> {
    throw new Error(
      "AzureBlobStorageProvider is not implemented. " +
        "Install @azure/storage-blob and implement this class."
    );
  }
}
