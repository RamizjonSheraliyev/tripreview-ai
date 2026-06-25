"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Youtube from "@tiptap/extension-youtube";
import Focus from "@tiptap/extension-focus";
import Dropcursor from "@tiptap/extension-dropcursor";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code as CodeIcon,
  Code2,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo2,
  Redo2,
  Minus,
  Eraser,
  Loader2,
} from "lucide-react";
import { uploadImage } from "@/lib/api";

const lowlight = createLowlight(common);

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
};

const FONT_COLORS = [
  "#0f172a", "#475569", "#dc2626", "#ea580c", "#ca8a04",
  "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777",
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing your post…",
  minHeight = 420,
  disabled = false,
}: Props) {
  const [uploading, setUploading] = React.useState(false);
  const [showTableMenu, setShowTableMenu] = React.useState(false);
  const [tableSel, setTableSel] = React.useState({ r: 0, c: 0 });
  const tableMenuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!showTableMenu) return;
    const onDown = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) setShowTableMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showTableMenu]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // Use our lowlight-powered code block instead of the default.
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { class: "text-brand-600 underline" },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-3" },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Typography,
      Subscript,
      Superscript,
      CharacterCount,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList.configure({ HTMLAttributes: { class: "tr-task-list" } }),
      TaskItem.configure({ nested: true }),
      Youtube.configure({ controls: true, modestBranding: true, HTMLAttributes: { class: "rounded-lg w-full aspect-video my-3" } }),
      Focus.configure({ className: "has-focus" }),
      Dropcursor.configure({ color: "#2563eb", width: 2 }),
      CodeBlockLowlight.configure({ lowlight, HTMLAttributes: { class: "rounded-lg" } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "tr-prose prose-sm max-w-none focus:outline-none px-4 py-3 min-h-[var(--rte-min-h)]",
        style: `--rte-min-h: ${minHeight}px`,
      },
    },
  });

  // Sync external value changes (e.g. when an existing post loads).
  React.useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
        style={{ minHeight }}
      >
        Loading editor…
      </div>
    );
  }

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const r = await uploadImage(file, "blog");
      const url = r.url;
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageBtn = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) handleImageUpload(f);
    };
    input.click();
  };

  const handleLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  };

  const handleYoutube = () => {
    const url = window.prompt("YouTube URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  };

  const handleTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTableMenu(false);
    setTableSel({ r: 0, c: 0 });
  };

  const TABLE_MAX = 8; // grid picker size (rows × cols)

  const handleColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
  };
  const resetColor = () => {
    editor.chain().focus().unsetColor().run();
  };

  const handleHighlight = (color: string) => {
    editor.chain().focus().toggleHighlight({ color }).run();
  };
  const resetHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Toolbar — sticks just below the admin site header (h-16, sticky top-0
          z-30) while the editor is in view, so formatting controls stay
          reachable on long posts instead of tucking behind the header. */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <Group>
          <Btn onClick={() => editor.chain().focus().undo().run()} title="Undo (Cmd+Z)">
            <Undo2 className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} title="Redo (Cmd+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Btn>
        </Group>
        <Sep />

        <Group>
          <SelectBlock editor={editor} />
        </Group>
        <Sep />

        <Group>
          <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <Bold className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <Italic className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
            <CodeIcon className="h-4 w-4" />
          </Btn>
        </Group>
        <Sep />

        <Group>
          <ColorPicker label="Text color" colors={FONT_COLORS} onPick={handleColor} onReset={resetColor} custom icon={<span className="font-bold leading-none">A</span>} />
          <ColorPicker label="Highlight" colors={["#fef08a", "#fde047", "#fed7aa", "#fecaca", "#fbcfe8", "#bbf7d0", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#e2e8f0"]} onPick={handleHighlight} onReset={resetHighlight} icon={<Highlighter className="h-4 w-4" />} />
        </Group>
        <Sep />

        <Group>
          <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left">
            <AlignLeft className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center">
            <AlignCenter className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right">
            <AlignRight className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify">
            <AlignJustify className="h-4 w-4" />
          </Btn>
        </Group>
        <Sep />

        <Group>
          <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
            <Heading1 className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
            <Heading2 className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
            <Heading3 className="h-4 w-4" />
          </Btn>
        </Group>
        <Sep />

        <Group>
          <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <List className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist">
            <ListChecks className="h-4 w-4" />
          </Btn>
        </Group>
        <Sep />

        <Group>
          <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
            <Quote className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
            <Code2 className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
            <Minus className="h-4 w-4" />
          </Btn>
        </Group>
        <Sep />

        <Group>
          <Btn onClick={handleLink} active={editor.isActive("link")} title="Insert / edit link">
            <LinkIcon className="h-4 w-4" />
          </Btn>
          <Btn onClick={handleImageBtn} title="Insert image" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </Btn>
          <Btn onClick={handleYoutube} title="Embed YouTube">
            <YoutubeIcon className="h-4 w-4" />
          </Btn>
          <div className="relative" ref={tableMenuRef}>
            <Btn
              onClick={() => setShowTableMenu((v) => !v)}
              active={showTableMenu}
              title="Insert table"
            >
              <TableIcon className="h-4 w-4" />
            </Btn>
            {showTableMenu && (
              <div className="absolute right-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <div className="mb-1.5 text-center text-xs font-medium text-slate-600">
                  {tableSel.r > 0 ? `${tableSel.r} × ${tableSel.c}` : "Select size"}
                </div>
                <div
                  className="grid gap-0.5"
                  style={{ gridTemplateColumns: `repeat(${TABLE_MAX}, 1.1rem)` }}
                  onMouseLeave={() => setTableSel({ r: 0, c: 0 })}
                >
                  {Array.from({ length: TABLE_MAX * TABLE_MAX }).map((_, i) => {
                    const r = Math.floor(i / TABLE_MAX) + 1;
                    const c = (i % TABLE_MAX) + 1;
                    const on = r <= tableSel.r && c <= tableSel.c;
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseEnter={() => setTableSel({ r, c })}
                        onClick={() => handleTable(r, c)}
                        className={`h-4 w-[1.1rem] rounded-[2px] border transition-colors ${on ? "border-blue-500 bg-blue-200" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                        aria-label={`${r} by ${c} table`}
                      />
                    );
                  })}
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-400">First row = header</p>
              </div>
            )}
          </div>
        </Group>
        <Sep />

        <Group>
          <Btn active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Subscript">
            <SubscriptIcon className="h-4 w-4" />
          </Btn>
          <Btn active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Superscript">
            <SuperscriptIcon className="h-4 w-4" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting">
            <Eraser className="h-4 w-4" />
          </Btn>
        </Group>
      </div>

      {/* Editor surface */}
      <div
        className="bg-white"
        onPaste={(e) => {
          // Catch pasted image files and route through our upload endpoint.
          const items = e.clipboardData?.items;
          if (!items) return;
          for (const it of Array.from(items)) {
            if (it.kind === "file" && it.type.startsWith("image/")) {
              const f = it.getAsFile();
              if (f) {
                e.preventDefault();
                handleImageUpload(f);
                return;
              }
            }
          }
        }}
        onDrop={(e) => {
          const f = e.dataTransfer?.files?.[0];
          if (f && f.type.startsWith("image/")) {
            e.preventDefault();
            handleImageUpload(f);
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[11px] text-slate-500">
        <span>
          {editor.storage.characterCount.words()} words •{" "}
          {editor.storage.characterCount.characters()} characters
        </span>
        <span>
          Powered by <span className="font-semibold text-slate-600">TipTap</span>
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function Btn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-0.5">{children}</div>;
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />;
}

function SelectBlock({ editor }: { editor: Editor }) {
  const current = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("heading", { level: 4 })
          ? "h4"
          : "p";
  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "p") editor.chain().focus().setParagraph().run();
        else if (v === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
        else if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
        else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
        else if (v === "h4") editor.chain().focus().toggleHeading({ level: 4 }).run();
      }}
      className="h-8 rounded-md border-0 bg-transparent px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      <option value="p">Paragraph</option>
      <option value="h1">Heading 1</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
      <option value="h4">Heading 4</option>
    </select>
  );
}

function ColorPicker({
  label,
  colors,
  onPick,
  onReset,
  custom,
  icon,
}: {
  label: string;
  colors: string[];
  onPick: (c: string) => void;
  onReset?: () => void;
  custom?: boolean;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [customColor, setCustomColor] = React.useState("#2563eb");
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        {icon}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg">
          <p className="mb-1.5 text-[11px] font-semibold text-slate-500">{label}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="h-6 w-6 rounded-md border border-slate-300 transition hover:scale-110 hover:ring-2 hover:ring-brand-300"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          {custom ? (
            <label className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                onBlur={() => { onPick(customColor); setOpen(false); }}
                className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-transparent p-0"
              />
              <button
                type="button"
                onClick={() => { onPick(customColor); setOpen(false); }}
                className="flex-1 rounded-md bg-slate-100 py-1 font-semibold text-slate-700 hover:bg-slate-200"
              >
                Apply custom
              </button>
            </label>
          ) : null}
          {onReset ? (
            <button
              type="button"
              onClick={() => { onReset(); setOpen(false); }}
              className="mt-2 w-full rounded-md border border-slate-200 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Remove color
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
