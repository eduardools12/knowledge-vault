/**
 * Path rules for files in the private `vault` bucket.
 *
 * Isomorphic on purpose: the browser builds the path when it uploads, and the
 * server checks it when the form arrives. One definition means the two cannot
 * disagree about what a valid path looks like.
 *
 * Shared across every feature that attaches a file — sources and inbox items
 * so far — because the bucket, its limits and its ownership rule are one
 * policy, not one per feature.
 */

export const BUCKET = "vault";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Mirrors `allowed_mime_types` on the bucket; the bucket is the real limit. */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/epub+zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/**
 * Whether a storage path belongs to this user.
 *
 * The convention is `{user_id}/{entity}/{file}`. Comparing the first segment is
 * the same rule the bucket policies apply, restated where the application reads
 * a path it was handed rather than one it derived — a form field can claim any
 * string, and Storage policies stop a bad *write*, not a bad *claim*.
 */
export function isOwnedPath(path: string, userId: string): boolean {
  if (path.includes("..") || path.startsWith("/")) {
    return false;
  }

  return path.split("/")[0] === userId;
}

/** Where a newly uploaded file for the given entity should live. */
export function buildStoragePath(userId: string, entity: string, fileName: string): string {
  const extension = fileName.includes(".")
    ? `.${fileName
        .split(".")
        .pop()!
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10)}`
    : "";

  // The original file name is deliberately dropped: it is user input inside a
  // path, and it often carries a person's or a client's name into a URL. The
  // display name lives in the database instead.
  return `${userId}/${entity}/${crypto.randomUUID()}${extension}`;
}
