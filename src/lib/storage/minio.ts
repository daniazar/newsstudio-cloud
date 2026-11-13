import { StorageClient } from "./types";
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
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return this.getUrl(key);
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`MinIO object has no content: ${key}`);
    }

    // Convert readable stream to Buffer
    const stream = response.Body as unknown as AsyncIterable<Buffer>;
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async createReadStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`MinIO object has no content: ${key}`);
    }
    return response.Body as unknown as Readable;
  }

  getUrl(key: string): string {
    const endpoint = process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.S3_ENDPOINT || "http://localhost:9000";
    if (process.env.NODE_ENV === "production" && (endpoint.includes("localhost") || endpoint.includes("127.0.0.1"))) {
      throw new Error(`Invalid S3 endpoint in production: ${endpoint}. Set NEXT_PUBLIC_S3_ENDPOINT or S3_ENDPOINT to a public cloud URL.`);
    }
    return `${endpoint}/${BUCKET_NAME}/${key}`;
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
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
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      });
      await s3Client.send(command);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
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

  async list(prefix?: string): Promise<import("./types").StorageItem[]> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    return (response.Contents || []).map((obj) => ({
      key: obj.Key || "",
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }
}
