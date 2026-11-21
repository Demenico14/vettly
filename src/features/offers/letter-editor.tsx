"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Heading, Italic, ListBullets, ListNumbers, MergeField, Minus, Quote, Strikethrough, Subheading, TextIcon, Underline, Upload, X } from "@/components/icons";
import { Button, toast } from "@/components/ui";
import { MERGE_FIELDS, STANDARD_TEMPLATE, unknownFields } from "@/lib/letter";
import { cn } from "@/lib/utils";
import { LETTER_TYPE } from "./letter-view";

type Block = { id: string; label: string; hint: string; icon: React.ReactNode; run: (e: Editor) => void };

const BLOCKS: Block[] = [
  { id: "text", label: "Text", hint: "Plain paragraph", icon: <TextIcon />, run: (e) => e.chain().focus().setParagraph().run() },
  { id: "heading", label: "Heading", hint: "Section title", icon: <Heading />, run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: "subheading", label: "Subheading", hint: "Smaller title", icon: <Subheading />, run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: "bullets", label: "Bulleted list", hint: "Simple list", icon: <ListBullets />, run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "numbers", label: "Numbered list", hint: "Steps or clauses", icon: <ListNumbers />, run: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "quote", label: "Quote", hint: "Set a passage apart", icon: <Quote />, run: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: "divider", label: "Divider", hint: "Horizontal line", icon: <Minus />, run: (e) => e.chain().focus().setHorizontalRule().run() },
];

const FIELD_BLOCKS: Block[] = MERGE_FIELDS.map((f) => ({
  id: `field:${f.key}`,
  label: f.label,
  hint: `{{${f.key}}}`,
  icon: <MergeField />,
  run: (e) => e.chain().focus().insertContent(`{{${f.key}}}`).run(),
}));

/** The "/" menu: what's typed after the slash at the cursor, and where to show the menu. */
type Slash = { query: string; from: number; to: number; caretTop: number; caretBottom: number; left: number };

function slashAt(editor: Editor): Slash | null {
  const { $from, empty } = editor.state.selection;
  if (!empty) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const m = before.match(/(?:^|\s)\/([\w ]{0,24})$/);
  if (!m) return null;
  const from = $from.pos - m[1]!.length - 1;
  const at = editor.view.coordsAtPos($from.pos);
  return { query: m[1]!.toLowerCase(), from, to: $from.pos, caretTop: at.top, caretBottom: at.bottom, left: at.left };
}

/**
 * A full-screen, Notion-style editor for HR's own offer letter. Type "/" for blocks and merge fields, select text
 * for formatting. Merge fields like {{first_name}} are filled from the offer when it's previewed and sent.
 */
export function LetterEditor({
  open,
  onOpenChange,
  html,
  source,
  candidateName,
  onSave,
  onUploadWord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  source: string | null;
  candidateName: string;
  onSave: (html: string) => void;
  onUploadWord: (file: File) => Promise<{ html: string; name: string } | null>;
}) {
  const [slash, setSlash] = React.useState<Slash | null>(null);
  const [active, setActive] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [name, setName] = React.useState(source);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const slashRef = React.useRef<{ slash: Slash | null; items: Block[]; active: number }>({ slash: null, items: [], active: 0 });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: false }),
      Placeholder.configure({ placeholder: ({ node }) => (node.type.name === "heading" ? "Heading" : "Type '/' for headings, lists and merge fields…") }),
    ],
    content: html || "<p></p>",
    editorProps: {
      attributes: { class: cn(LETTER_TYPE, "min-h-[60vh] outline-none"), "aria-label": "Offer letter", "aria-multiline": "true", role: "textbox" },
      handleKeyDown: (_view, event) => {
        const s = slashRef.current;
        if (!s.slash || !s.items.length) return false;
        if (event.key === "ArrowDown") {
          setActive((a) => (a + 1) % s.items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setActive((a) => (a - 1 + s.items.length) % s.items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          choose(s.items[s.active]!);
          return true;
        }
        if (event.key === "Escape") {
          setSlash(null);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => setSlash(slashAt(e)),
    onSelectionUpdate: ({ editor: e }) => setSlash(slashAt(e)),
  });

  const items = React.useMemo(() => {
    if (!slash) return [];
    const q = slash.query.trim();
    return [...BLOCKS, ...FIELD_BLOCKS].filter((b) => !q || b.label.toLowerCase().includes(q) || b.hint.toLowerCase().includes(q)).slice(0, 10);
  }, [slash]);
  const current = Math.min(active, Math.max(0, items.length - 1));
  // The editor's key handler reads the menu's state through this ref; keep it in step after each render.
  React.useLayoutEffect(() => {
    slashRef.current = { slash, items, active: current };
  }, [slash, items, current]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start each new query at the first match
    setActive(0);
  }, [slash?.query]);

  // Load the letter each time the editor opens, so it always starts from what's saved.
  React.useEffect(() => {
    if (open && editor) {
      editor.commands.setContent(html || "<p></p>");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reflect the saved source when reopened
      setName(source);
      requestAnimationFrame(() => editor.commands.focus("end"));
    }
  }, [open, editor, html, source]);

  function choose(b: Block) {
    const s = slashRef.current.slash;
    if (!editor || !s) return;
    editor.chain().focus().deleteRange({ from: s.from, to: s.to }).run();
    b.run(editor);
    setSlash(null);
  }

  const upload = async (file?: File) => {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const r = await onUploadWord(file);
      if (r) {
        editor.commands.setContent(r.html);
        setName(r.name);
        toast.success("Letter imported", `${r.name}. Check the formatting, then add merge fields where the details should go.`);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /** Keeps what's written however the editor is closed (Done, X, Escape, a click outside), like Notion: nothing is lost by accident. */
  const close = () => {
    if (editor) {
      const out = editor.getHTML();
      const unknown = unknownFields(out);
      if (unknown.length) toast.error("Check the merge fields", `${unknown.map((k) => `{{${k}}}`).join(", ")} isn't a field Vettly knows. The offer can't be saved until it's fixed.`);
      onSave(editor.isEmpty ? "" : out);
    }
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col bg-canvas focus:outline-none data-[state=open]:animate-fade-in"
          onEscapeKeyDown={(e) => slash && e.preventDefault()}
          aria-describedby={undefined}
        >
          <header className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close the letter">
                <X />
              </Button>
            </DialogPrimitive.Close>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-sm font-semibold text-fg">Offer letter · {candidateName}</DialogPrimitive.Title>
              <p className="truncate text-xs text-fg-subtle">{name ? `From ${name}` : "Your own wording"} · changes are kept when you close; save the offer to keep them for good</p>
            </div>
            <input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" loading={uploading} onClick={() => fileRef.current?.click()}>
              {!uploading && <Upload />}
              Replace with Word file
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => {
                editor?.commands.setContent(STANDARD_TEMPLATE);
                setName(null);
              }}
            >
              Start from standard letter
            </Button>
            <Button size="sm" onClick={close}>
              Done
            </Button>
          </header>

          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[46rem] px-6 pt-12 pb-32 sm:px-12">
                <p className="mb-1 text-xs font-semibold tracking-wider text-fg-subtle uppercase">Offer letter</p>
                <p className="mb-8 text-[2rem] leading-tight font-bold tracking-tight text-fg">{candidateName}</p>
                {editor && (
                  <BubbleMenu editor={editor} options={{ placement: "top" }} className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-lg">
                    {(
                      [
                        { label: "Bold", icon: <Bold />, on: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
                        { label: "Italic", icon: <Italic />, on: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
                        { label: "Underline", icon: <Underline />, on: editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
                        { label: "Strikethrough", icon: <Strikethrough />, on: editor.isActive("strike"), run: () => editor.chain().focus().toggleStrike().run() },
                        { label: "Heading", icon: <Heading />, on: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
                        { label: "Bulleted list", icon: <ListBullets />, on: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
                      ] as const
                    ).map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        aria-label={b.label}
                        aria-pressed={b.on}
                        onClick={b.run}
                        className={cn("grid size-8 place-items-center rounded-md text-fg-muted hover:bg-surface-muted hover:text-fg [&_svg]:size-4", b.on && "bg-primary-50 text-primary-700")}
                      >
                        {b.icon}
                      </button>
                    ))}
                  </BubbleMenu>
                )}
                <EditorContent editor={editor} />
              </div>
            </div>

            <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-line bg-surface px-5 py-6 lg:block">
              <p className="text-sm font-semibold text-fg">Merge fields</p>
              <p className="mt-1 text-xs text-fg-muted">Filled in from the offer when it&apos;s previewed and sent. Click to insert, or type / and the field name.</p>
              <ul className="mt-4 flex flex-col gap-1">
                {MERGE_FIELDS.map((f) => (
                  <li key={f.key}>
                    <button
                      type="button"
                      onClick={() => editor?.chain().focus().insertContent(`{{${f.key}}}`).run()}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-muted"
                    >
                      <span>{f.label}</span>
                      <code className="font-mono text-2xs text-fg-subtle">{`{{${f.key}}}`}</code>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {slash && items.length > 0 && (
            <div
              role="listbox"
              aria-label="Insert a block"
              className="fixed z-[60] w-72 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg"
              style={{
                // Below the cursor when there's room, otherwise above it, so the menu never covers the line being typed.
                ...(slash.caretBottom + 340 < window.innerHeight ? { top: slash.caretBottom + 6 } : { bottom: Math.max(8, window.innerHeight - slash.caretTop + 6) }),
                left: Math.max(8, Math.min(slash.left, window.innerWidth - 296)),
              }}
            >
              <p className="px-3 pt-1.5 pb-1 text-2xs font-semibold tracking-wider text-fg-subtle uppercase">{slash.query ? "Matches" : "Blocks and fields"}</p>
              {items.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  role="option"
                  aria-selected={i === current}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(b);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex w-full items-center gap-3 px-3 py-1.5 text-left", i === current && "bg-surface-muted")}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface text-fg-muted [&_svg]:size-4">{b.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">{b.label}</span>
                    <span className="block truncate text-xs text-fg-subtle">{b.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
