import { generateHTML } from "@tiptap/html";

import {
  documentExtensions,
  isDocumentEmpty,
  sanitizeDocument,
  type KnowledgeDocument,
} from "@/features/knowledge/document";

/**
 * Renders a stored document as HTML, on the server.
 *
 * A read-only Tiptap instance would work too, but it would ship the whole
 * editor to the browser for a page whose entire job is reading. This produces
 * plain HTML with no client JavaScript at all.
 *
 * ## On `dangerouslySetInnerHTML`
 *
 * The name is a warning worth answering rather than working around. Three
 * things make this safe, and it stops being safe if any of them is removed:
 *
 * 1. `generateHTML` cannot emit arbitrary markup. It walks the ProseMirror
 *    schema and renders only the nodes and marks that schema defines; text
 *    content is escaped by the serialiser.
 * 2. The document was sanitised before being stored — unknown nodes dropped,
 *    link protocols restricted to http/https/mailto.
 * 3. It is sanitised again here, because a row could predate the current schema
 *    or arrive from a future importer rather than from this editor.
 *
 * The remaining free-form values are attributes on schema-defined nodes, and
 * `href` — the only one that could execute anything — is what the protocol
 * allowlist covers.
 */
export function RenderedContent({ document }: { document: KnowledgeDocument }) {
  const safe = sanitizeDocument(document);

  if (isDocumentEmpty(safe)) {
    return (
      <p className="text-muted-foreground text-sm italic">
        Este conhecimento ainda não tem conteúdo.
      </p>
    );
  }

  const html = generateHTML(safe, documentExtensions);

  return (
    <div
      className="knowledge-prose"
      // Safe by construction; see the note above before changing this.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
