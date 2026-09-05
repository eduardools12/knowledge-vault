export { ALLOWED_MIME_TYPES, BUCKET, isOwnedPath, MAX_FILE_BYTES } from "@/lib/storage";

import { buildStoragePath } from "@/lib/storage";

/** Where a newly uploaded source file should live. */
export function buildSourcePath(userId: string, fileName: string): string {
  return buildStoragePath(userId, "sources", fileName);
}

