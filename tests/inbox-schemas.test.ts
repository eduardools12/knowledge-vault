import { describe, expect, it } from "vitest";

import { inboxCaptureSchema, inboxItemFormSchema } from "@/features/inbox/schemas";

/**
 * `inboxCaptureSchema` routes one submitted field into a different column
 * depending on `kind` — the kind of logic that does not crash when wrong, it
 * just files a link under `content` or a note under `url` and the mistake
 * only surfaces later, on whatever screen reads that column back.
 */
describe("inboxCaptureSchema", () => {
  it("routes a link into the url field, adding https:// when missing", () => {
    const result = inboxCaptureSchema.parse({ kind: "link", text: "exemplo.com/artigo" });

    expect(result).toEqual({
      kind: "link",
      title: null,
      url: "https://exemplo.com/artigo",
      content: null,
      storagePath: null,
    });
  });

  it("keeps an explicit protocol on a link", () => {
    const result = inboxCaptureSchema.parse({ kind: "link", text: "http://exemplo.com" });

    expect(result.url).toBe("http://exemplo.com");
  });

  it("rejects a link kind whose normalised url is too long", () => {
    const result = inboxCaptureSchema.safeParse({ kind: "link", text: "a".repeat(2001) });

    expect(result.success).toBe(false);
  });

  it("routes note, idea and reference kinds into the content field", () => {
    for (const kind of ["note", "idea", "reference"] as const) {
      const result = inboxCaptureSchema.parse({ kind, text: "um texto qualquer" });

      expect(result).toEqual({
        kind,
        title: null,
        url: null,
        content: "um texto qualquer",
        storagePath: null,
      });
    }
  });

  it("rejects a text kind with nothing written", () => {
    const result = inboxCaptureSchema.safeParse({ kind: "note", text: "" });

    expect(result.success).toBe(false);
  });

  it("requires a storage path for the file kind, ignoring text", () => {
    const missing = inboxCaptureSchema.safeParse({ kind: "file", text: "ignorado" });

    expect(missing.success).toBe(false);

    const withPath = inboxCaptureSchema.parse({
      kind: "file",
      text: "ignorado",
      storagePath: "user-1/inbox/abc.pdf",
    });

    expect(withPath).toEqual({
      kind: "file",
      title: null,
      url: null,
      content: null,
      storagePath: "user-1/inbox/abc.pdf",
    });
  });

  it("carries an optional title through for every kind", () => {
    const result = inboxCaptureSchema.parse({ kind: "note", title: "Um título", text: "corpo" });

    expect(result.title).toBe("Um título");
  });
});

describe("inboxItemFormSchema", () => {
  const base = {
    kind: "note" as const,
    status: "unprocessed" as const,
    title: "",
    url: "",
    content: "",
    note: "",
    storagePath: "",
  };

  it("rejects an item with no payload in title, url, content or file", () => {
    const result = inboxItemFormSchema.safeParse(base);

    expect(result.success).toBe(false);
  });

  it("accepts an item whose only content is a note-adjacent field, like the note itself, only when paired with a payload field", () => {
    // `note` alone does not satisfy the database's `inbox_items_has_payload`
    // check, so the schema must not accept it alone either.
    const noteOnly = inboxItemFormSchema.safeParse({ ...base, note: "só uma nota" });

    expect(noteOnly.success).toBe(false);
  });

  it("accepts an item once title is filled in", () => {
    const result = inboxItemFormSchema.safeParse({ ...base, title: "Algo" });

    expect(result.success).toBe(true);
  });

  it("normalises a url missing its protocol", () => {
    const result = inboxItemFormSchema.parse({ ...base, url: "exemplo.com" });

    expect(result.url).toBe("https://exemplo.com");
  });

  it("turns untouched optional fields into null, not empty strings", () => {
    const result = inboxItemFormSchema.parse({ ...base, title: "Algo" });

    expect(result.url).toBeNull();
    expect(result.content).toBeNull();
    expect(result.note).toBeNull();
    expect(result.storagePath).toBeNull();
  });
});
