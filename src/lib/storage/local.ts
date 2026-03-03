/**
 * Local Filesystem Storage Provider
 *
 * For development and testing. Files stored in /tmp or configurable path.
 */

import * as fs from "fs";
import * as path from "path";
import type { StorageProvider, PutOptions, GetOptions } from "./types";
import { getContentType } from "./types";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private basePath: string;
  private baseUrl: string;

  constructor(options?: { basePath?: string; baseUrl?: string }) {
    this.basePath = options?.basePath || process.env.LOCAL_STORAGE_PATH || "/tmp/adgen-storage";
    this.baseUrl = options?.baseUrl || process.env.LOCAL_STORAGE_URL || "/api/storage";

    // Ensure base directory exists
    this.ensureDir(this.basePath);
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private getFullPath(key: string): string {
    // Sanitize key to prevent path traversal
    const sanitized = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(this.basePath, sanitized);
  }

  async put(key: string, buffer: Buffer, options?: PutOptions): Promise<string> {
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);

    this.ensureDir(dir);

    // Write file
    fs.writeFileSync(fullPath, buffer);

    // Write metadata if provided
    if (options?.metadata) {
      const metaPath = fullPath + ".meta.json";
      fs.writeFileSync(
        metaPath,
        JSON.stringify({
          contentType: options.contentType || getContentType(key),
          metadata: options.metadata,
          cacheControl: options.cacheControl,
          createdAt: new Date().toISOString(),
        })
      );
    }

    return this.getUrl(key);
  }

  async get(key: string, _options?: GetOptions): Promise<Buffer | null> {
    const fullPath = this.getFullPath(key);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return fs.readFileSync(fullPath);
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    return fs.existsSync(fullPath);
  }

  async delete(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);

    if (!fs.existsSync(fullPath)) {
      return false;
    }

    fs.unlinkSync(fullPath);

    // Also delete metadata if exists
    const metaPath = fullPath + ".meta.json";
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    return true;
  }

  getUrl(key: string): string {
    // In dev, serve via API route
    return `${this.baseUrl}/${key}`;
  }

  async list(prefix?: string): Promise<string[]> {
    const searchPath = prefix ? this.getFullPath(prefix) : this.basePath;

    if (!fs.existsSync(searchPath)) {
      return [];
    }

    const results: string[] = [];

    const walk = (dir: string, baseKey: string = ""): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const key = baseKey ? `${baseKey}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          walk(fullPath, key);
        } else if (!entry.name.endsWith(".meta.json")) {
          results.push(key);
        }
      }
    };

    if (fs.statSync(searchPath).isDirectory()) {
      walk(searchPath, prefix || "");
    }

    return results;
  }
}
