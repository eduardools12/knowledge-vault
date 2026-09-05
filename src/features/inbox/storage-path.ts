export { ALLOWED_MIME_TYPES, BUCKET, isOwnedPath, MAX_FILE_BYTES } from "@/lib/storage";

import { buildStoragePath } from "@/lib/storage";

/** Where a newly captured inbox file should live. */
export function buildInboxPath(userId: string, fileName: string): string {
  return buildStoragePath(userId, "inbox", fileName);
}
