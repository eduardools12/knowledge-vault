"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useState } from "react";

import { EditorToolbar } from "@/features/knowledge/components/editor-toolbar";
import {
  documentExtensions,
  EMPTY_DOCUMENT,
  type KnowledgeDocument,
} from "@/features/knowledge/document";
import { cn } from "@/lib/utils";

/**
 * The writing surface.
 *
 * The document is mirrored into a hidden input so the surrounding form posts it
 * like any other field. That keeps the form a plain `<form action={...}>` with
 * a Server Action — no fetch, no client-side submit handler, and the whole
 * thing still works the moment hydration finishes.
 */
export function KnowledgeEditor({
  name,
  defaultValue,
  ariaDescribedBy,
}: {
  /** Field name for the hidden input carrying the JSON document. */
  name: string;
  defaultValue?: KnowledgeDocument;
  ariaDescribedBy?: string;
}) {
  const initial = defaultValue ?? EMPTY_DOCUMENT;
  const [document, setDocument] = useState<KnowledgeDocument>(initial);
  const [focused, setFocused] = useState(false);

  const editor = useEditor({
    extensions: documentExtensions,
    content: initial,
    // Required under SSR. Rendering the editor during the server pass produces
    // markup the client immediately replaces, which React reports as a
    // hydration mismatch on every load.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // The editable region is a labelled region for assistive technology;
        // without this it announces as an unnamed text box.
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Conteúdo do conhecimento",
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
      },
    },
    onUpdate: ({ editor: instance }) => {
      setDocument(instance.getJSON() as KnowledgeDocument);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  return (
    <div
      className={cn(
        "knowledge-editor bg-background overflow-hidden rounded-lg border transition-colors",
        // The ring is drawn on the wrapper so it frames the toolbar and the
        // text together, which is what the user perceives as "the editor".
        focused && "border-ring ring-ring/50 ring-[3px]",
      )}
    >
      {editor ? <EditorToolbar editor={editor} /> : <div className="h-[42px] border-b" />}

      <EditorContent editor={editor} className="knowledge-prose" />

      {/*
        Serialised on every keystroke. It is a JSON stringify of a document
        that is already in memory — cheap next to what the editor itself does
        per keystroke, and it means the form has no submit-time work to do.
      */}
      <input type="hidden" name={name} value={JSON.stringify(document)} />
    </div>
  );
}
