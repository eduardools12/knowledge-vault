"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  HighlighterIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  SquareCodeIcon,
  StrikethroughIcon,
  TableIcon,
  Undo2Icon,
  UnlinkIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Formatting controls for the editor.
 *
 * The active states come from `useEditorState` rather than reading the editor
 * directly during render. Tiptap's editor is a mutable object outside React, so
 * a component that reads `editor.isActive(...)` inline renders once and then
 * shows stale buttons for the rest of the session.
 */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
      highlight: instance.isActive("highlight"),
      h1: instance.isActive("heading", { level: 1 }),
      h2: instance.isActive("heading", { level: 2 }),
      h3: instance.isActive("heading", { level: 3 }),
      bulletList: instance.isActive("bulletList"),
      orderedList: instance.isActive("orderedList"),
      taskList: instance.isActive("taskList"),
      blockquote: instance.isActive("blockquote"),
      codeBlock: instance.isActive("codeBlock"),
      link: instance.isActive("link"),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  return (
    <div
      role="toolbar"
      aria-label="Formatação"
      aria-orientation="horizontal"
      className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5"
    >
      <ToolbarButton
        label="Negrito"
        shortcut="Ctrl+B"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Itálico"
        shortcut="Ctrl+I"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Tachado"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Destaque"
        active={state.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <HighlighterIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Código"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <CodeIcon />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label="Título 1"
        active={state.h1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1Icon />
      </ToolbarButton>

      <ToolbarButton
        label="Título 2"
        active={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2Icon />
      </ToolbarButton>

      <ToolbarButton
        label="Título 3"
        active={state.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3Icon />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label="Lista"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Lista numerada"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Checklist"
        active={state.taskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListTodoIcon />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label="Citação"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <QuoteIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Bloco de código"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <SquareCodeIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Linha divisória"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <MinusIcon />
      </ToolbarButton>

      <ToolbarButton
        label="Tabela"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon />
      </ToolbarButton>

      <ToolbarSeparator />

      <LinkControl editor={editor} isActive={state.link} />

      <ToolbarSeparator />

      <ToolbarButton
        label="Desfazer"
        shortcut="Ctrl+Z"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2Icon />
      </ToolbarButton>

      <ToolbarButton
        label="Refazer"
        shortcut="Ctrl+Shift+Z"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2Icon />
      </ToolbarButton>
    </div>
  );
}

function ToolbarSeparator() {
  return <Separator orientation="vertical" className="mx-1 h-5" />;
}

function ToolbarButton({
  label,
  shortcut,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            // `type="button"` is not optional: the toolbar lives inside the
            // knowledge form, and a bare <button> would submit it on every
            // click on Bold.
            type="button"
            variant="ghost"
            size="icon-sm"
            // `aria-pressed` is what tells a screen reader the state; the
            // background colour only conveys it to people who can see it.
            aria-pressed={active}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(active && "bg-accent text-accent-foreground")}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? <span className="text-muted-foreground ml-2">{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Adding and removing links.
 *
 * A popover with a real input rather than `window.prompt`: the prompt dialog
 * cannot be styled, is blocked outright in some embedded contexts, and steals
 * focus from the editor in a way that loses the selection.
 */
function LinkControl({ editor, isActive }: { editor: Editor; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");

  function apply() {
    const value = href.trim();

    if (!value) {
      return;
    }

    // A bare "exemplo.com" is what people type. Without a protocol the link
    // resolves relative to the app and 404s inside the vault.
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;

    editor.chain().focus().extendMarkRange("link").setLink({ href: withProtocol }).run();

    setHref("");
    setOpen(false);
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);

          if (next) {
            setHref(editor.getAttributes("link").href ?? "");
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Inserir link"
              aria-pressed={isActive}
              className={cn(isActive && "bg-accent text-accent-foreground")}
            />
          }
        >
          <LinkIcon />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-80 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={href}
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  // Otherwise Enter reaches the surrounding form and submits it.
                  event.preventDefault();
                  apply();
                }
              }}
              placeholder="https://exemplo.com"
              aria-label="Endereço do link"
              autoFocus
            />
            <Button type="button" size="sm" onClick={apply}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {isActive ? (
        <ToolbarButton
          label="Remover link"
          onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
        >
          <UnlinkIcon />
        </ToolbarButton>
      ) : null}
    </>
  );
}
