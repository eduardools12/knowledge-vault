"use client";

import { FileIcon, Loader2Icon, PaperclipIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { ALLOWED_MIME_TYPES, BUCKET, MAX_FILE_BYTES } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; name: string }
  | { kind: "ready"; name: string }
  | { kind: "error"; message: string };

/**
 * Attaches a file to a record — a source or an inbox item.
 *
 * The upload goes from the browser straight to Supabase Storage, and only the
 * resulting path is submitted with the form. A Server Action body is capped far
 * below the bucket's 50 MB, and pushing a large file through the Next server
 * would double the bandwidth for nothing.
 *
 * That is safe because the bucket's policies confine every write to the user's
 * own `{user_id}/` prefix, and because the server re-checks the submitted path
 * against the same rule — a form field can claim anything. `buildPath` is what
 * tells the two feature-specific rules (`sources/{uuid}` vs `inbox/{uuid}`)
 * apart while the upload and validation logic stays in one place.
 */
export function FileField({
  name,
  userId,
  buildPath,
  existingPath,
  existingLabel,
}: {
  name: string;
  userId: string;
  /** Where the upload should live, e.g. `buildSourcePath` or `buildInboxPath`. */
  buildPath: (userId: string, fileName: string) => string;
  existingPath?: string | null;
  /** What to call the already-attached file, since the path carries no name. */
  existingLabel?: string;
}) {
  const inputId = useId();
  const [path, setPath] = useState(existingPath ?? "");
  const [status, setStatus] = useState<Status>(
    existingPath ? { kind: "ready", name: existingLabel ?? "Arquivo anexado" } : { kind: "idle" },
  );

  async function upload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setStatus({
        kind: "error",
        message: `O arquivo tem ${formatBytes(file.size)}. O limite é ${formatBytes(MAX_FILE_BYTES)}.`,
      });

      return;
    }

    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      // The bucket rejects it too; saying so here avoids a pointless upload.
      setStatus({
        kind: "error",
        message: "Tipo de arquivo não aceito. Use PDF, texto, CSV, EPUB ou imagem.",
      });

      return;
    }

    setStatus({ kind: "uploading", name: file.name });

    const supabase = createSupabaseBrowserClient();
    const target = buildPath(userId, file.name);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(target, file, { contentType: file.type, upsert: false });

    if (error) {
      setStatus({ kind: "error", message: "Falha no envio. Tente novamente." });

      return;
    }

    setPath(target);
    setStatus({ kind: "ready", name: file.name });
  }

  function clear() {
    // The object is left in the bucket on purpose. Removing it here would
    // delete a file the user might still be editing away from — the server
    // cleans up the previous file only once the new row is actually saved.
    setPath("");
    setStatus({ kind: "idle" });
  }

  return (
    <div className="grid gap-2">
      {/* The path, not the file, is what the form submits. */}
      <input type="hidden" name={name} value={path} />

      <input
        id={inputId}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void upload(file);
          }

          // Cleared so choosing the same file twice still fires a change.
          event.target.value = "";
        }}
      />

      {status.kind === "ready" ? (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <FileIcon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{status.name}</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={clear} aria-label="Remover arquivo">
            <XIcon />
          </Button>
        </div>
      ) : (
        <Button
          nativeButton={false}
          render={<label htmlFor={inputId} />}
          variant="outline"
          className="w-fit cursor-pointer"
          disabled={status.kind === "uploading"}
        >
          {status.kind === "uploading" ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              Enviando {status.name}…
            </>
          ) : (
            <>
              <PaperclipIcon className="size-4" aria-hidden="true" />
              Anexar arquivo
            </>
          )}
        </Button>
      )}

      {status.kind === "error" ? (
        <p role="alert" className="text-destructive text-xs">
          {status.message}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          PDF, texto, CSV, EPUB ou imagem, até {formatBytes(MAX_FILE_BYTES)}. Guardado em bucket
          privado e servido por link temporário.
        </p>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);

  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.round(bytes / 1024)} KB`;
}
