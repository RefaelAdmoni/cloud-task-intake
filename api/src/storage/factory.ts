import { config } from "../config";
import { StorageProvider, StorageProviderName } from "./types";
import { LocalStorageProvider } from "./local.provider";
import { AzureBlobStorageProvider } from "./azure-blob.provider";
import { S3StorageProvider } from "./s3.provider";
import { GCSStorageProvider } from "./gcs.provider";

let instance: StorageProvider | null = null;

export function createStorageProvider(
  name?: StorageProviderName
): StorageProvider {
  const providerName = name ?? (config.STORAGE_PROVIDER as StorageProviderName);

  switch (providerName) {
    case "local":
      return new LocalStorageProvider(
        config.PUBLIC_STORAGE_BASE_URL,
        config.LOCAL_STORAGE_PATH
      );

    case "azure-blob": {
      const accountName = config.AZURE_STORAGE_ACCOUNT_NAME;
      const containerName = config.AZURE_STORAGE_CONTAINER_NAME;
      const sasToken = config.AZURE_STORAGE_SAS_TOKEN;
      if (!accountName || !containerName || !sasToken) {
        throw new Error(
          "AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME, and AZURE_STORAGE_SAS_TOKEN " +
            "are required when STORAGE_PROVIDER=azure-blob"
        );
      }
      return new AzureBlobStorageProvider(accountName, containerName, sasToken);
    }

    case "s3": {
      const region = config.AWS_REGION;
      const bucket = config.AWS_S3_BUCKET;
      if (!region || !bucket) {
        throw new Error(
          "AWS_REGION and AWS_S3_BUCKET are required when STORAGE_PROVIDER=s3"
        );
      }
      return new S3StorageProvider(region, bucket);
    }

    case "gcs": {
      const projectId = config.GCP_PROJECT_ID;
      const bucket = config.GCP_STORAGE_BUCKET;
      if (!projectId || !bucket) {
        throw new Error(
          "GCP_PROJECT_ID and GCP_STORAGE_BUCKET are required when STORAGE_PROVIDER=gcs"
        );
      }
      return new GCSStorageProvider(projectId, bucket);
    }

    default: {
      const _exhaustive: never = providerName;
      throw new Error(`Unknown STORAGE_PROVIDER: ${_exhaustive}`);
    }
  }
}

/** Returns a lazily-created singleton storage provider. */
export function getStorageProvider(): StorageProvider {
  if (!instance) {
    instance = createStorageProvider();
  }
  return instance;
}
