"use server";

import { MAX_CONTACT_FILE_BYTES, MAX_CONTACT_FILES, parseContactInput } from "@/lib/contact";
import { sendContactRequest } from "@/lib/email";
import { appCopy } from "@/lib/i18n-request";
import { safeErrorLog } from "@/lib/db-errors";

export type ContactActionResult = { ok: true } | { ok: false; error: string };

export async function submitContactRequest(formData: FormData): Promise<ContactActionResult> {
  const { dict } = await appCopy();
  const parsed = parseContactInput({
    email: String(formData.get("email") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    descriptionHtml: String(formData.get("descriptionHtml") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: dict.contact.invalid };
  }

  const files = formData.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > MAX_CONTACT_FILES) {
    return { ok: false, error: dict.contact.invalid };
  }

  const attachments: { filename: string; content: Buffer }[] = [];
  for (const file of files) {
    if (file.size > MAX_CONTACT_FILE_BYTES) {
      return { ok: false, error: dict.contact.invalid };
    }
    attachments.push({
      filename: file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 80) || "attachment",
      content: Buffer.from(await file.arrayBuffer()),
    });
  }

  try {
    const result = await sendContactRequest({
      ...parsed.data,
      attachments,
    });
    if (!result.sent) {
      return { ok: false, error: dict.contact.error };
    }
    return { ok: true };
  } catch (error) {
    console.error("submitContactRequest failed", safeErrorLog(error));
    return { ok: false, error: dict.contact.error };
  }
}
