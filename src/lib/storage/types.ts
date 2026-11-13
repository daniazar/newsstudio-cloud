import type { Readable } from "stream";

export interface StorageClient {
  /**
   * Upload a buffer to the storage system
   * @param key The destination path or key inside the storage system
   * @param buffer The file content buffer
   * @param contentType The MIME type of the file
   * @returns The public URL of the uploaded asset
   */
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;

  /**
   * Download a file's content from the storage system
   * @param key The path or key of the file in the storage system
   * @returns The file content as a Buffer
   */
  download(key: string): Promise<Buffer>;

  /**
   * Get the accessible public URL of the asset
   * @param key The path or key of the file
   * @returns The URL string
   */
  getUrl(key: string): string;

  /**
   * Delete an asset from the storage system
   * @param key The path or key of the file to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Batch delete multiple assets from the storage system
   * @param keys Array of keys to delete
   */
  deleteMany?(keys: string[]): Promise<void>;

  /**
   * Check if an asset exists in the storage system
   * @param key The path or key to check
   */
  exists(key: string): Promise<boolean>;

  /**
   * List items in the storage system with an optional prefix
   * @param prefix Optional path or prefix to filter items
   */
  list?(prefix?: string): Promise<StorageItem[]>;

  /**
   * Returns a readable stream for zero-copy video streaming directly from storage.
   * @param key The path or key of the file to stream
   */
  createReadStream?(key: string): Promise<Readable> | Readable;

  /**
   * Generate a presigned time-limited URL for secure access
   * @param key The path or key of the file
   * @param expiresInSeconds Duration in seconds before URL expires (default 3600)
   */
  getSignedUrl?(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Generate a presigned URL for direct client upload (PutObjectCommand)
   * @param key The destination path or key inside the storage system
   * @param contentType The MIME type of the file to be uploaded
   * @param expiresInSeconds Duration in seconds before URL expires (default 3600)
   */
  getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Generate a presigned URL for direct client download/read (GetObjectCommand)
   * @param key The path or key of the file
   * @param expiresInSeconds Duration in seconds before URL expires (default 3600)
   */
  getPresignedReadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export interface StorageItem {
  key: string;
  size?: number;
  lastModified?: Date;
}
