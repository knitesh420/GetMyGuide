"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorToolbar } from "./EditorToolbar";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Enter rich text content...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: true }),
      Underline,
      TextStyle,
      Color,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      HorizontalRule,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "min-h-55 outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current && content !== "") {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <div className={cn("space-y-3", className)}>
      <EditorToolbar editor={editor} />
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <EditorContent
          editor={editor}
          className="prose prose-lg prose-slate max-w-none m-0 min-h-55 rounded-3xl p-4 focus:outline-none
            prose-headings:font-bold prose-headings:text-slate-800
            prose-strong:text-slate-800 prose-strong:font-semibold
            prose-ul:list-disc prose-ul:pl-5
            prose-ol:list-decimal prose-ol:pl-5
            prose-li:my-1 prose-p:my-2 prose-hr:my-4"
        />
      </div>
    </div>
  );
}
