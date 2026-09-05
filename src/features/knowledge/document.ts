import { Highlight } from "@tiptap/extension-highlight";
import { Link } from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";

/**
 * The knowledge document: its schema, its plain-text projection, and the
 * validation that stands between a submitted document and the database.
 *
 * Deliberately free of `@tiptap/react`, because both sides need it: the browser
 * to run the editor, and the server to render stored content back to HTML and
 * to derive the search text. One definition means the editor cannot produce a
 * node the renderer does not understand.
 */

/** Protocols a link may use. Everything else — `javascript:` above all — is dropped. */
const ALLOWED_LINK_PROTOCOLS = ["http", "https", "mailto"] as const;

export const documentExtensions = [
  StarterKit.configure({
    link: {
      openOnClick: false,
      protocols: [...ALLOWED_LINK_PROTOCOLS],
      // Applies while typing and pasting. It is the first of two gates; the
      // second, `sanitizeDocument`, runs on the server and is the one that
      // actually matters, because this one lives in the browser.
      isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && hasAllowedProtocol(url),
    },
    // The vault is Portuguese-language prose; three heading levels is enough
    // structure for a note and keeps the toolbar from becoming a menu.
    heading: { levels: [1, 2, 3] },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight,
  TableKit.configure({ table: { resizable: true } }),
  Placeholder.configure({
    placeholder: "Comece a escrever. O que você entendeu sobre isso?",
  }),
];

/**
 * `Link` is re-exported so the toolbar can reach the same configured instance
 * rather than importing its own and drifting from the schema above.
 */
export { Link };

function hasAllowedProtocol(url: string): boolean {
  try {
    // A relative URL has no protocol of its own; resolving against a dummy base
    // makes `new URL` total, so a malformed value returns false instead of
    // throwing halfway through a document walk.
    const parsed = new URL(url, "https://knowledge-vault.invalid");

    return (ALLOWED_LINK_PROTOCOLS as readonly string[]).includes(parsed.protocol.replace(":", ""));
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Document shape
// -----------------------------------------------------------------------------

/**
 * JSON, spelled out.
 *
 * The document is stored in a `jsonb` column, and the generated Supabase types
 * describe that column as JSON. Typing `attrs` as `Record<string, unknown>`
 * would be honest about the editor but would not be assignable to it, forcing a
 * cast at every write — and a cast at a write is exactly where a real mismatch
 * would go unnoticed.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type DocumentNode = {
  type: string;
  attrs?: Record<string, JsonValue>;
  content?: DocumentNode[];
  marks?: { type: string; attrs?: Record<string, JsonValue> }[];
  text?: string;
};

export type KnowledgeDocument = { type: "doc"; content: DocumentNode[] };

export const EMPTY_DOCUMENT: KnowledgeDocument = { type: "doc", content: [] };

/**
 * Node and mark types the schema above can actually produce.
 *
 * Anything outside these lists is removed rather than rejected: a document is a
 * user's writing, and losing an unknown decoration is a far better outcome than
 * refusing to save the paragraph it was attached to.
 */
const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
]);

const ALLOWED_MARKS = new Set(["bold", "italic", "strike", "underline", "code", "link", "highlight"]);

/**
 * Guards against a hand-crafted payload that is legal JSON but pathological:
 * deep nesting blows the stack on any recursive walk, and an enormous node
 * count turns a single save into a denial of service.
 */
const MAX_DEPTH = 40;
const MAX_NODES = 20_000;

/**
 * Returns a document containing only what the schema allows.
 *
 * Runs on the server before every write. The editor already constrains what a
 * user can produce, but the editor is in the browser: a Server Action accepts
 * whatever is posted to it, and this content is later rendered back as HTML.
 */
export function sanitizeDocument(value: unknown): KnowledgeDocument {
  if (!isPlainObject(value) || value.type !== "doc") {
    return EMPTY_DOCUMENT;
  }

  let budget = MAX_NODES;

  function walk(node: unknown, depth: number): DocumentNode | null {
    if (depth > MAX_DEPTH || budget <= 0 || !isPlainObject(node)) {
      return null;
    }

    const type = node.type;

    if (typeof type !== "string" || !ALLOWED_NODES.has(type)) {
      return null;
    }

    budget -= 1;

    const clean: DocumentNode = { type };

    if (typeof node.text === "string") {
      clean.text = node.text;
    }

    if (isPlainObject(node.attrs)) {
      clean.attrs = node.attrs as Record<string, JsonValue>;
    }

    if (Array.isArray(node.marks)) {
      const marks = node.marks
        .filter(isPlainObject)
        .filter((mark) => typeof mark.type === "string" && ALLOWED_MARKS.has(mark.type))
        .filter((mark) => {
          if (mark.type !== "link") {
            return true;
          }

          // A link whose protocol is not allowed loses the mark, not the text —
          // the words stay, they simply stop being clickable.
          const href = isPlainObject(mark.attrs) ? mark.attrs.href : undefined;

          return typeof href === "string" && hasAllowedProtocol(href);
        })
        .map((mark) => ({
          type: mark.type as string,
          ...(isPlainObject(mark.attrs) ? { attrs: mark.attrs as Record<string, JsonValue> } : {}),
        }));

      if (marks.length > 0) {
        clean.marks = marks;
      }
    }

    if (Array.isArray(node.content)) {
      const content = node.content
        .map((child) => walk(child, depth + 1))
        .filter((child): child is DocumentNode => child !== null);

      if (content.length > 0) {
        clean.content = content;
      }
    }

    return clean;
  }

  const content = Array.isArray(value.content)
    ? value.content
        .map((child) => walk(child, 1))
        .filter((child): child is DocumentNode => child !== null)
    : [];

  return { type: "doc", content };
}

// -----------------------------------------------------------------------------
// Plain-text projection
// -----------------------------------------------------------------------------

/** Block-level nodes that should read as separate lines in the flattened text. */
const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "taskItem",
  "codeBlock",
  "tableRow",
]);

/**
 * Flattens a document into the text stored in `knowledge.content_text`.
 *
 * Derived on the server rather than taken from the client, on purpose: this
 * column is the search index, and a browser that sent text not matching its
 * own document would make records findable by words they do not contain — or,
 * worse, quietly unfindable.
 */
export function documentToPlainText(document: KnowledgeDocument): string {
  const lines: string[] = [];
  let current = "";

  function flush() {
    const trimmed = current.trim();

    if (trimmed) {
      lines.push(trimmed);
    }

    current = "";
  }

  function walk(node: DocumentNode) {
    if (node.type === "text" && node.text) {
      current += node.text;
      return;
    }

    if (node.type === "hardBreak") {
      current += " ";
      return;
    }

    // A table cell is not its own line, but the text of two adjacent cells must
    // not run together into a word that exists in neither.
    if (node.type === "tableCell" || node.type === "tableHeader") {
      node.content?.forEach(walk);
      current += " ";
      return;
    }

    const isBlock = BLOCK_NODES.has(node.type);

    node.content?.forEach(walk);

    if (isBlock) {
      flush();
    }
  }

  document.content.forEach(walk);
  flush();

  return lines.join("\n");
}

/** Whether the document holds anything worth saving. */
export function isDocumentEmpty(document: KnowledgeDocument): boolean {
  return documentToPlainText(document).length === 0;
}

/**
 * Builds a minimal document out of plain text, one paragraph per line.
 *
 * Used to pre-fill the editor when a knowledge record starts from something
 * that was never rich text in the first place — an inbox capture. Blank lines
 * are dropped rather than turned into empty paragraphs, so pasted text with
 * loose spacing does not open the editor full of blank lines.
 */
export function documentFromPlainText(text: string): KnowledgeDocument {
  const content: DocumentNode[] = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ type: "paragraph", content: [{ type: "text", text: line }] }));

  return { type: "doc", content };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
