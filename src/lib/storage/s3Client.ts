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

function resolvePrefixedKey(objectKey: string): { logical: string; bucketKey: string; prefix: string } {
  const prefix = (process.env.S3_KEY_PREFIX || "").trim().replace(/^\/+|\/+$/g, "");
  const clean = objectKey.replace(/^\/+/, "");
  const logical = prefix && clean.startsWith(`${prefix}/`) ? clean.slice(prefix.length + 1) : clean;
  const bucketKey = prefix ? `${prefix}/${logical}` : logical;
  return { logical, bucketKey, prefix };
}

/**
 * Upload a local file to the S3/R2/MinIO bucket
 * @returns The public URL of the uploaded asset
 */
export async function uploadAssetToS3(localFilePath: string, objectKey: string, contentType: string): Promise<string> {
  const fileStream = fs.createReadStream(localFilePath);
  const { logical, bucketKey, prefix } = resolvePrefixedKey(objectKey);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: bucketKey,
    Body: fileStream,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public URL
  // When NEXT_PUBLIC_S3_PUBLIC_URL is configured (e.g. https://pub-xxx.r2.dev or https://pub-xxx.r2.dev/newsstudio),
  // return direct key access without duplicating bucket name or prefix.
  const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  if (publicUrl) {
    const base = publicUrl.replace(/\/+$/, "");
    if (prefix && base.endsWith(`/${prefix}`)) {
      return `${base}/${logical}`;
    }
    return `${base}/${bucketKey}`;
  }

  const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.S3_ENDPOINT || "http://localhost:9000";
  return `${endpoint.replace(/\/+$/, "")}/${BUCKET_NAME}/${bucketKey}`;
}

/**
 * Delete an asset from the S3/R2/MinIO bucket
 */
export async function deleteAssetFromS3(objectKey: string): Promise<void> {
  const { bucketKey } = resolvePrefixedKey(objectKey);
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: bucketKey,
  });
  await s3Client.send(command);
}
