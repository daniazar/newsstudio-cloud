import { StorageClient, StorageItem } from "./types";
import { s3Client, BUCKET_NAME } from "./s3Client";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

export class MinioStorageClient implements StorageClient {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const cleanKey = key.replace(/^\/+/, "");
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return this.getUrl(cleanKey);
  }

  async download(key: string): Promise<Buffer> {
    const cleanKey = key.replace(/^\/+/, "");
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`MinIO/S3 object has no content: ${cleanKey}`);
    }

    // Convert readable stream to Buffer
    const stream = response.Body as unknown as AsyncIterable<Buffer>;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async createReadStream(key: string): Promise<Readable> {
    const cleanKey = key.replace(/^\/+/, "");
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`MinIO/S3 object has no content: ${cleanKey}`);
    }
    return response.Body as unknown as Readable;
  }

  getUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, "");
    const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
    if (publicUrl) {
      // Cloudflare R2 pub-xxx.r2.dev or custom CDN domains map directly to bucket root
      return `${publicUrl.replace(/\/+$/, "")}/${cleanKey}`;
    }

    const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.S3_ENDPOINT || "http://localhost:9000";
    if (process.env.NODE_ENV === "production" && (endpoint.includes("localhost") || endpoint.includes("127.0.0.1"))) {
      throw new Error(`Invalid S3 endpoint in production: ${endpoint}. Set NEXT_PUBLIC_S3_PUBLIC_URL, NEXT_PUBLIC_S3_ENDPOINT, or S3_ENDPOINT to a public cloud URL.`);
    }
    return `${endpoint.replace(/\/+$/, "")}/${BUCKET_NAME}/${cleanKey}`;
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    return this.getPresignedReadUrl(key, expiresInSeconds);
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds: number = 3600): Promise<string> {
    const cleanKey = key.replace(/^\/+/, "");
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
      ContentType: contentType,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  }

  async getPresignedReadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const cleanKey = key.replace(/^\/+/, "");
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, "");
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });
    await s3Client.send(command);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!keys || keys.length === 0) return;
    const batchSize = 1000;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const command = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: batch.map((Key) => ({ Key: Key.replace(/^\/+/, "") })),
          Quiet: true,
        },
      });
      await s3Client.send(command);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, "");
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: cleanKey,
      });
      await s3Client.send(command);
      return true;
    } catch (error: unknown) {
      const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async list(prefix?: string): Promise<StorageItem[]> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix ? prefix.replace(/^\/+/, "") : undefined,
    });

    const response = await s3Client.send(command);
    return (response.Contents || []).map((obj) => ({
      key: obj.Key || "",
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }
}
