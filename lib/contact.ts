export const CONTACT_TOPICS = ["general", "billing", "support", "partnership", "other"] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const MAX_CONTACT_FILES = 4;
export const MAX_CONTACT_FILE_BYTES = 2 * 1024 * 1024;

/** Same-origin Route Handler — Server Actions + multipart hang on OpenNext Workers. */
export const CONTACT_API_PATH = "/api/contact";

/** Client abort before Cloudflare hung-worker cancellation (~30s). */
export const CONTACT_FETCH_TIMEOUT_MS = 25_000;

export type ContactSubmitResult = { ok: true } | { ok: false; error: string };

export type ContactAttachment = { filename: string; content: Uint8Array };

export function isContactUpload(item: FormDataEntryValue): item is File {
  return typeof File !== "undefined" && item instanceof File && item.size > 0;
}

export function contactUploadFilename(file: File) {
  const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 80);
  return name || "attachment";
}

export async function collectContactAttachments(formData: FormData) {
  const files = formData.getAll("attachments").filter(isContactUpload);
  if (files.length > MAX_CONTACT_FILES) {
    return { success: false as const };
  }
  const attachments: ContactAttachment[] = [];
  for (const file of files) {
    if (file.size > MAX_CONTACT_FILE_BYTES) {
      return { success: false as const };
    }
    attachments.push({
      filename: contactUploadFilename(file),
      content: new Uint8Array(await file.arrayBuffer()),
    });
  }
  return { success: true as const, attachments };
}

const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "A", "BLOCKQUOTE", "DIV", "SPAN"]);

export function isContactTopic(value: string | undefined | null): value is ContactTopic {
  return CONTACT_TOPICS.includes(value as ContactTopic);
}

export function sanitizeContactHtml(html: string) {
  const text = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  return text.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag: string, attrs: string) => {
    const tag = rawTag.toUpperCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (full.startsWith("</")) return `</${rawTag.toLowerCase()}>`;
    if (tag === "BR") return "<br />";
    if (tag === "A") {
      const href = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const url = (href?.[2] ?? href?.[3] ?? href?.[4] ?? "").trim();
      if (!/^https?:\/\//i.test(url) && !url.startsWith("mailto:")) return "<a>";
      return `<a href="${url.replace(/"/g, "")}">`;
    }
    const align = attrs.match(/text-align:\s*(left|center|right)/i);
    if (align) return `<${rawTag.toLowerCase()} style="text-align:${align[1].toLowerCase()}">`;
    return `<${rawTag.toLowerCase()}>`;
  });
}

export function contactPlainText(html: string) {
  return sanitizeContactHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseContactInput(input: {
  email?: string;
  topic?: string;
  subject?: string;
  descriptionHtml?: string;
}) {
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase();
  const topic = String(input.topic ?? "").trim();
  const subject = String(input.subject ?? "").trim();
  const descriptionHtml = sanitizeContactHtml(String(input.descriptionHtml ?? ""));
  const description = contactPlainText(descriptionHtml);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false as const, error: "invalid" };
  }
  if (!isContactTopic(topic) || !subject || !description) {
    return { success: false as const, error: "invalid" };
  }
  return {
    success: true as const,
    data: { email, topic, subject, descriptionHtml, description },
  };
}
