// PLACEHOLDER - AWS S3 implementation
//
// Required env vars:
//   AWS_REGION            — e.g. us-east-1
//   AWS_S3_BUCKET         — S3 bucket name
//   AWS_ACCESS_KEY_ID     — (not needed when running on AWS with an IAM role)
//   AWS_SECRET_ACCESS_KEY — (not needed when running on AWS with an IAM role)
//
// Install:
//   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
//
// Implementation guide:
//   import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
//   import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
//
//   presign:
//     const client = new S3Client({ region });
//     const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
//       Bucket: bucket,
//       Key: key,
//       ContentType: contentType,
//     }), { expiresIn: 900 }); // 15 minutes
//     const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
//     return { uploadUrl, fileUrl };
//
//   ping:
//     Use HeadBucketCommand to check bucket accessibility.

import { StorageProvider, PresignResult } from "./types";

export class S3StorageProvider implements StorageProvider {
  constructor(
    private readonly region: string,
    private readonly bucket: string
  ) {}

  async presign(_key: string, _contentType: string): Promise<PresignResult> {
    throw new Error(
      "S3StorageProvider is not implemented. " +
        "Install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner and implement this class."
    );
  }

  async ping(): Promise<void> {
    throw new Error(
      "S3StorageProvider is not implemented. " +
        "Install @aws-sdk/client-s3 and implement this class."
    );
  }
}
