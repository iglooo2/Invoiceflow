"use server";

import { collectContactAttachments, parseContactInput, type ContactSubmitResult } from "@/lib/contact";
import { sendContactRequest } from "@/lib/email";
import { appCopy } from "@/lib/i18n-request";
import { safeErrorLog } from "@/lib/db-errors";
import { copyCloudflareAuthEnvToProcess, ensureCloudflareContext } from "@/lib/runtime-env";

export type ContactActionResult = ContactSubmitResult;

export async function submitContactRequest(formData: FormData): Promise<ContactSubmitResult> {
  await ensureCloudflareContext();
  copyCloudflareAuthEnvToProcess();
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

  const files = await collectContactAttachments(formData);
  if (!files.success) {
    return { ok: false, error: dict.contact.invalid };
  }

  try {
    const result = await sendContactRequest({
      ...parsed.data,
      attachments: files.attachments,
    });
    if (!result.sent) {
      return {
        ok: false,
        error: result.reason === "not_configured" ? dict.contact.notConfigured : dict.contact.deliveryFailed,
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("submitContactRequest failed", safeErrorLog(error));
    return { ok: false, error: dict.contact.error };
  }
}
