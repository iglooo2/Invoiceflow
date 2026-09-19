"use client";

import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Quote,
} from "lucide-react";
import { submitContactRequest } from "@/app/actions/contact";
import { CONTACT_TOPICS } from "@/lib/contact";
import type { Dictionary } from "@/lib/dictionary";

export function ContactForm({ copy }: { copy: Dictionary["contact"] }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function addLink() {
    const url = window.prompt(copy.linkPrompt, "https://");
    if (url) exec("createLink", url);
  }

  function takeFiles(list: FileList | null) {
    if (!list?.length) return;
    setFiles((current) => [...current, ...Array.from(list)].slice(0, 4));
  }

  if (sent) {
    return (
      <div className="mx-auto w-full max-w-[520px] rounded-[28px] border border-[#d4a24a] bg-[#050a1f] px-8 py-14 text-center text-white">
        <h1 className="font-display text-3xl">{copy.successTitle}</h1>
        <p className="mt-3 text-sm text-white/60">{copy.successBody}</p>
        <button
          type="button"
          className="mt-8 w-full rounded-full bg-[#6f5728] py-3 text-sm font-medium text-[#1a1408]"
          onClick={() => {
            setSent(false);
            setFiles([]);
            setError(null);
          }}
        >
          {copy.sendAnother}
        </button>
      </div>
    );
  }

  return (
    <form
      className="mx-auto w-full max-w-[520px] rounded-[28px] border border-[#d4a24a] bg-[#050a1f] px-7 py-8 text-white shadow-[0_24px_80px_-32px_rgba(0,0,0,0.65)]"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        const form = event.currentTarget;
        const data = new FormData(form);
        data.set("descriptionHtml", editorRef.current?.innerHTML ?? "");
        data.delete("attachments");
        for (const file of files) data.append("attachments", file);
        const result = await submitContactRequest(data);
        setPending(false);
        if (result.ok) {
          setSent(true);
          form.reset();
          if (editorRef.current) editorRef.current.innerHTML = "";
          return;
        }
        setError(result.error);
      }}
    >
      <div className="text-center">
        <h1 className="font-display text-[2rem] leading-tight">{copy.title}</h1>
        <p className="mt-2 text-sm text-white/55">{copy.lede}</p>
      </div>

      <label className="mt-8 block text-sm">
        {copy.email} <span className="text-[#e0b44a]">*</span>
      </label>
      <input
        name="email"
        type="email"
        required
        placeholder={copy.emailPlaceholder}
        className="mt-2 h-11 w-full rounded-full bg-[#ececec] px-4 text-sm text-[#1c1917] outline-none placeholder:text-[#9a9a9a]"
      />

      <label className="mt-5 block text-sm">
        {copy.topic}
      </label>
      <select
        name="topic"
        defaultValue=""
        className="mt-2 h-11 w-full appearance-none rounded-full bg-[#ececec] bg-[length:16px] bg-[right_16px_center] bg-no-repeat px-4 text-sm text-[#1c1917] outline-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")",
        }}
      >
        <option value="" disabled>
          {copy.topicPlaceholder}
        </option>
        {CONTACT_TOPICS.map((topic) => (
          <option key={topic} value={topic}>
            {copy.topics[topic]}
          </option>
        ))}
      </select>

      <label className="mt-5 block text-sm">
        {copy.subject} <span className="text-[#e0b44a]">*</span>
      </label>
      <input
        name="subject"
        required
        placeholder={copy.subjectPlaceholder}
        className="mt-2 h-11 w-full rounded-full bg-[#ececec] px-4 text-sm text-[#1c1917] outline-none placeholder:text-[#9a9a9a]"
      />

      <label className="mt-5 block text-sm">
        {copy.description} <span className="text-[#e0b44a]">*</span>
      </label>
      <div className="mt-2 overflow-hidden rounded-[22px] bg-white text-[#1c1917]">
        <div className="flex flex-wrap items-center gap-1 border-b border-[#ececec] px-3 py-2 text-[#444]">
          <ToolbarButton label={copy.bold} onClick={() => exec("bold")}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label={copy.italic} onClick={() => exec("italic")}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label={copy.bulletList} onClick={() => exec("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label={copy.numberedList} onClick={() => exec("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label={copy.alignLeft} onClick={() => exec("justifyLeft")}>
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label={copy.alignCenter} onClick={() => exec("justifyCenter")}>
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label={copy.alignRight} onClick={() => exec("justifyRight")}>
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-[#ddd]" />
          <ToolbarButton label={copy.link} onClick={addLink}>
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label={copy.quote} onClick={() => exec("formatBlock", "blockquote")}>
            <Quote className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-label={copy.description}
          data-placeholder={copy.descriptionPlaceholder}
          className="min-h-[160px] px-4 py-3 text-sm outline-none empty:before:pointer-events-none empty:before:text-[#9a9a9a] empty:before:content-[attr(data-placeholder)]"
        />
      </div>

      <p className="mt-5 text-sm">{copy.attachments}</p>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          takeFiles(event.dataTransfer.files);
        }}
        className="mt-2 flex min-h-[120px] w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-[#d4a24a] text-sm text-white/70"
      >
        <Paperclip className="mb-2 h-5 w-5" />
        {copy.attach}
        {files.length ? (
          <span className="mt-2 text-xs text-white/50">{files.map((file) => file.name).join(", ")}</span>
        ) : null}
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {error ? <p className="mt-4 text-sm text-[#f0b4a8]">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 h-12 w-full rounded-full bg-[#6f5728] text-sm font-medium text-[#1a1408] disabled:opacity-70"
      >
        {pending ? copy.sending : copy.submit}
      </button>
    </form>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f3f3f3]"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
