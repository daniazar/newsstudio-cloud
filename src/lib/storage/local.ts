import { StorageClient } from "./types";
import fs from "fs/promises";
import { existsSync, createReadStream, ReadStream } from "fs";
import path from "path";

export class LocalStorageClient implements StorageClient {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve("./public/assets");
    // Ensure root directory exists
    if (!existsSync(this.baseDir)) {
      fs.mkdir(this.baseDir, { recursive: true }).catch(() => {});
    }
  }

  private getFullPath(key: string): string {
    // Prevent directory traversal attacks by resolving and validating relative path
    const fullPath = path.resolve(this.baseDir, key);
    const relative = path.relative(this.baseDir, fullPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("Security: Directory traversal attempt detected.");
    }
    return fullPath;
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const fullPath = this.getFullPath(key);
    const parentDir = path.dirname(fullPath);
    
    // Ensure nested folder structure exists
    if (!existsSync(parentDir)) {
      await fs.mkdir(parentDir, { recursive: true });
    }

    await fs.writeFile(fullPath, buffer);
    
    // Return relative public URL for browser loading
    return `/assets/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    return await fs.readFile(fullPath);
  }

  createReadStream(key: string): ReadStream {
    const fullPath = this.getFullPath(key);
    return createReadStream(fullPath);
  }

  getUrl(key: string): string {
    return `/assets/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    if (existsSync(fullPath)) {
      await fs.unlink(fullPath);
    }
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => this.delete(k)));
  }

  async getSignedUrl(key: string, _expiresInSeconds: number = 3600): Promise<string> {
    return this.getUrl(key);
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    return existsSync(fullPath);
  }

  async list(prefix: string = ""): Promise<import("./types").StorageItem[]> {
    const targetDir = prefix ? path.resolve(this.baseDir, prefix) : this.baseDir;
    const items: import("./types").StorageItem[] = [];

    const walk = async (dir: string) => {
      if (!existsSync(dir)) return;
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(fullPath);
            const key = path.relative(this.baseDir, fullPath).replace(/\\/g, "/");
            items.push({
              key,
              size: stat.size,
              lastModified: stat.mtime,
            });
          } catch {}
        }
      }
    };

    await walk(targetDir);
    return items;
  }
}
