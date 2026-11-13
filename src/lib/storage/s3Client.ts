import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";

// Initialize S3/R2/MinIO client
export const s3Client = new S3Client({
  region: process.env.S3_REGION || (process.env.STORAGE_PROVIDER === "r2" ? "auto" : "us-east-1"),
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  forcePathStyle: process.env.STORAGE_PROVIDER !== "r2",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "admin",
    secretAccessKey: process.env.S3_SECRET_KEY || "password123",
  },
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "news-studio";

/**
 * Upload a local file to the S3/R2/MinIO bucket
 * @returns The public URL of the uploaded asset
 */
export async function uploadAssetToS3(localFilePath: string, objectKey: string, contentType: string): Promise<string> {
  const fileStream = fs.createReadStream(localFilePath);
  const cleanKey = objectKey.replace(/^\/+/, "");
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cleanKey,
    Body: fileStream,
    ContentType: contentType,
  });

  await s3Client.send(command);
  
  // Return the public URL
  // When NEXT_PUBLIC_S3_PUBLIC_URL is configured (e.g. https://pub-xxx.r2.dev),
  // return direct key access without bucket name since R2 custom/public domains map to bucket root.
  const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/+$/, "")}/${cleanKey}`;
  }

  const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.S3_ENDPOINT || "http://localhost:9000";
  return `${endpoint.replace(/\/+$/, "")}/${BUCKET_NAME}/${cleanKey}`;
}

/**
 * Delete an asset from the S3/R2/MinIO bucket
 */
export async function deleteAssetFromS3(objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectKey.replace(/^\/+/, ""),
  });
  await s3Client.send(command);
}
