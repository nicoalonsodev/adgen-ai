/**
 * Storage Module
 *
 * Exports storage provider based on environment configuration.
 *
 * STORAGE_PROVIDER=local (default) | s3 | gcs
 */

import type { StorageProvider } from "./types";
import { LocalStorageProvider } from "./local";

export * from "./types";
export { LocalStorageProvider } from "./local";

// Singleton instance
let storageInstance: StorageProvider | null = null;

/**
 * Get the configured storage provider
 */
export function getStorage(): StorageProvider {
  if (storageInstance) {
    return storageInstance;
  }

  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "local":
      storageInstance = new LocalStorageProvider();
      break;

    case "s3":
      // TODO: Implement S3StorageProvider
      throw new Error("S3 storage not implemented yet");

    case "gcs":
      // TODO: Implement GCSStorageProvider
      throw new Error("GCS storage not implemented yet");

    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }

  return storageInstance;
}

/**
 * Reset storage instance (useful for testing)
 */
export function resetStorage(): void {
  storageInstance = null;
}
