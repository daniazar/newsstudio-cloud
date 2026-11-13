import { DeleteObjectCommand,PutObjectCommand,S3Client } from "@aws-sdk/client-s3";
import fs from "fs";

// Initialize S3 Client pointing to local MinIO container
export const s3Client = new S3Client({
  region: "us-east-1", // required by SDK but arbitrary for MinIO
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  forcePathStyle: true, // required for MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "admin",
    secretAccessKey: process.env.S3_SECRET_KEY || "password123",
  },
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "news-studio";

/**
 * Upload a local file to the MinIO bucket
 * @returns The public URL of the uploaded asset
 */
export async function uploadAssetToS3(localFilePath: string, objectKey: string, contentType: string): Promise<string> {
  const fileStream = fs.createReadStream(localFilePath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
    Body: fileStream,
    ContentType: contentType,
  });

  await s3Client.send(command);
  
  // Return the public URL
  // Since we set "download" anonymous policy in Docker Compose, we can access it directly.
  const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.S3_ENDPOINT || "http://localhost:9000";
  return `${endpoint}/${BUCKET_NAME}/${objectKey}`;
}

/**
 * Delete an asset from the MinIO bucket
 */
export async function deleteAssetFromS3(objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey,
  });
  await s3Client.send(command);
}
