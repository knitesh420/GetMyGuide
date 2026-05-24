"use client";

import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  RotateCw,
  Square,
  Slash,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
}

const toolbarButton = (isActive: boolean) =>
  cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-all",
    isActive
      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
  );

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const textColor = editor.getAttributes("textStyle").color || "#000000";
  const highlightColor = editor.getAttributes("highlight").color || "#fde047";

  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={toolbarButton(editor.isActive("bold"))}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={toolbarButton(editor.isActive("italic"))}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={toolbarButton(editor.isActive("underline"))}
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={toolbarButton(editor.isActive("strike"))}
        title="Strike"
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={toolbarButton(editor.isActive("bulletList"))}
        title="Bullet list"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={toolbarButton(editor.isActive("orderedList"))}
        title="Ordered list"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={toolbarButton(editor.isActive("blockquote"))}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={toolbarButton(false)}
        title="Horizontal rule"
      >
        <Slash className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        className={toolbarButton(false)}
        title="Undo"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        className={toolbarButton(false)}
        title="Redo"
      >
        <RotateCw className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
          <span>Text</span>
          <input
            type="color"
            value={textColor}
            onChange={(event) =>
              editor.chain().focus().setColor(event.target.value).run()
            }
            className="h-8 w-10 cursor-pointer rounded-md border-0 p-0"
            title="Text color"
          />
        </label>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
          <span>Highlight</span>
          <input
            type="color"
            value={highlightColor}
            onChange={(event) =>
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: event.target.value })
                .run()
            }
            className="h-8 w-10 cursor-pointer rounded-md border-0 p-0"
            title="Highlight color"
          />
        </label>
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={toolbarButton(editor.isActive({ textAlign: "left" }))}
          title="Align left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={toolbarButton(editor.isActive({ textAlign: "center" }))}
          title="Align center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={toolbarButton(editor.isActive({ textAlign: "right" }))}
          title="Align right"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={toolbarButton(editor.isActive({ textAlign: "justify" }))}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
