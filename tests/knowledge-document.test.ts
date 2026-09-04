import { describe, expect, it } from "vitest";

import {
  documentToPlainText,
  isDocumentEmpty,
  sanitizeDocument,
  type JsonValue,
  type KnowledgeDocument,
} from "@/features/knowledge/document";

/**
 * Two jobs are tested here, both of which fail silently if wrong.
 *
 * `sanitizeDocument` is the only thing between a posted payload and content the
 * server will later render back as HTML — the editor runs in the browser and
 * constrains nothing an attacker has to respect.
 *
 * `documentToPlainText` produces the search index. A mistake there does not
 * crash anything; it just makes records findable by words they do not contain,
 * or quietly impossible to find at all.
 */

function paragraph(text: string, marks?: { type: string; attrs?: Record<string, JsonValue> }[]) {
  return { type: "paragraph", content: [{ type: "text", text, ...(marks ? { marks } : {}) }] };
}

describe("sanitizeDocument", () => {
  it("keeps a well-formed document intact", () => {
    const input = { type: "doc", content: [paragraph("Pandas é uma biblioteca.")] };

    expect(sanitizeDocument(input)).toEqual(input);
  });

  it("rejects anything that is not a document", () => {
    for (const value of [null, undefined, "texto", 42, [], { type: "paragraph" }, {}]) {
      expect(sanitizeDocument(value)).toEqual({ type: "doc", content: [] });
    }
  });

  it("drops nodes whose type is not in the schema", () => {
    const input = {
      type: "doc",
      content: [paragraph("fica"), { type: "script", content: [{ type: "text", text: "sai" }] }],
    };

    const result = sanitizeDocument(input);

    expect(result.content).toHaveLength(1);
    expect(documentToPlainText(result)).toBe("fica");
  });

  it("drops marks the schema does not define", () => {
    const result = sanitizeDocument({
      type: "doc",
      content: [paragraph("texto", [{ type: "bold" }, { type: "onmouseover" }])],
    });

    expect(result.content[0]?.content?.[0]?.marks).toEqual([{ type: "bold" }]);
  });

  it("strips a javascript: link but keeps the words", () => {
    // The text a person wrote is theirs; only the dangerous attribute goes.
    const result = sanitizeDocument({
      type: "doc",
      content: [
        paragraph("clique aqui", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]),
      ],
    });

    expect(result.content[0]?.content?.[0]?.marks).toBeUndefined();
    expect(documentToPlainText(result)).toBe("clique aqui");
  });

  it("strips other dangerous protocols", () => {
    for (const href of [
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "JAVASCRIPT:alert(1)",
      " javascript:alert(1)",
    ]) {
      const result = sanitizeDocument({
        type: "doc",
        content: [paragraph("x", [{ type: "link", attrs: { href } }])],
      });

      expect(result.content[0]?.content?.[0]?.marks, href).toBeUndefined();
    }
  });

  it("keeps links on protocols that are allowed", () => {
    for (const href of ["https://exemplo.com/a", "http://exemplo.com", "mailto:a@b.com"]) {
      const result = sanitizeDocument({
        type: "doc",
        content: [paragraph("x", [{ type: "link", attrs: { href } }])],
      });

      expect(result.content[0]?.content?.[0]?.marks?.[0]?.type, href).toBe("link");
    }
  });

  it("drops a link mark with no href at all", () => {
    const result = sanitizeDocument({
      type: "doc",
      content: [paragraph("x", [{ type: "link", attrs: {} }])],
    });

    expect(result.content[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("survives a document nested far deeper than the limit", () => {
    // A payload built to blow the stack of any recursive walk.
    let node: Record<string, unknown> = { type: "paragraph", content: [] };

    for (let i = 0; i < 500; i += 1) {
      node = { type: "blockquote", content: [node] };
    }

    expect(() => sanitizeDocument({ type: "doc", content: [node] })).not.toThrow();
  });

  it("stops after the node budget instead of processing an unbounded payload", () => {
    const content = Array.from({ length: 30_000 }, () => paragraph("spam"));

    const result = sanitizeDocument({ type: "doc", content });

    expect(result.content.length).toBeLessThan(30_000);
  });
});

describe("documentToPlainText", () => {
  it("returns an empty string for an empty document", () => {
    expect(documentToPlainText({ type: "doc", content: [] })).toBe("");
  });

  it("puts each block on its own line", () => {
    const doc: KnowledgeDocument = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Título" }] },
        paragraph("Primeiro."),
        paragraph("Segundo."),
      ],
    };

    expect(documentToPlainText(doc)).toBe("Título\nPrimeiro.\nSegundo.");
  });

  it("keeps text that carries marks", () => {
    const doc = sanitizeDocument({
      type: "doc",
      content: [paragraph("importante", [{ type: "bold" }])],
    });

    expect(documentToPlainText(doc)).toBe("importante");
  });

  it("gives each list item its own line", () => {
    const doc = sanitizeDocument({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [paragraph("um")] },
            { type: "listItem", content: [paragraph("dois")] },
          ],
        },
      ],
    });

    // The paragraph inside the item flushes the line; the item must not add a
    // second, empty one.
    expect(documentToPlainText(doc)).toBe("um\ndois");
  });

  it("separates adjacent table cells so their words do not merge", () => {
    // Without a separator "xG" and "PPDA" would index as "xGPPDA", matching
    // neither term.
    const doc = sanitizeDocument({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [paragraph("xG")] },
                { type: "tableCell", content: [paragraph("PPDA")] },
              ],
            },
          ],
        },
      ],
    });

    expect(documentToPlainText(doc)).toContain("xG");
    expect(documentToPlainText(doc)).toContain("PPDA");
    expect(documentToPlainText(doc)).not.toContain("xGPPDA");
  });

  it("turns a hard break into a space rather than joining words", () => {
    const doc = sanitizeDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "linha um" },
            { type: "hardBreak" },
            { type: "text", text: "linha dois" },
          ],
        },
      ],
    });

    expect(documentToPlainText(doc)).toBe("linha um linha dois");
  });

  it("ignores blocks that hold no text", () => {
    const doc = sanitizeDocument({
      type: "doc",
      content: [paragraph("texto"), { type: "paragraph" }, { type: "horizontalRule" }],
    });

    expect(documentToPlainText(doc)).toBe("texto");
  });
});

describe("isDocumentEmpty", () => {
  it("is true for a document with no text", () => {
    expect(isDocumentEmpty({ type: "doc", content: [] })).toBe(true);
    // What the editor produces when the user clicks in and types nothing.
    expect(isDocumentEmpty(sanitizeDocument({ type: "doc", content: [{ type: "paragraph" }] }))).toBe(
      true,
    );
  });

  it("is true for whitespace only", () => {
    expect(isDocumentEmpty(sanitizeDocument({ type: "doc", content: [paragraph("   ")] }))).toBe(true);
  });

  it("is false once there is content", () => {
    expect(isDocumentEmpty(sanitizeDocument({ type: "doc", content: [paragraph("a")] }))).toBe(false);
  });
});
