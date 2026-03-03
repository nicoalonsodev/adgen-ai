/**
 * Storage Interface
 *
 * Abstract storage layer supporting local filesystem and cloud providers.
 * Implementations can be swapped via environment variables.
 */

export interface StorageObject {
  key: string;
  buffer: Buffer;
  contentType: string;
  size: number;
  lastModified?: Date;
}

export interface PutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface GetOptions {
  encoding?: BufferEncoding;
}

export interface StorageProvider {
  /**
   * Provider name for logging
   */
  readonly name: string;

  /**
   * Store a buffer under a key
   */
  put(key: string, buffer: Buffer, options?: PutOptions): Promise<string>;

  /**
   * Retrieve a buffer by key
   */
  get(key: string, options?: GetOptions): Promise<Buffer | null>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Delete a key
   */
  delete(key: string): Promise<boolean>;

  /**
   * Get a public URL for the key (if supported)
   */
  getUrl(key: string): string;

  /**
   * List keys with optional prefix
   */
  list(prefix?: string): Promise<string[]>;
}

/**
 * Get content type from extension
 */
export function getContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

/**
 * Generate a unique storage key
 */
export function generateStorageKey(prefix: string, ext: string = "png"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${timestamp}_${random}.${ext}`;
}
