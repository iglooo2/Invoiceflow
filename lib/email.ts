import "server-only";
import type { ContactTopic } from "@/lib/contact";
import { classifyResendFailure, resolveContactMailbox, type ContactSendReason } from "@/lib/contact-delivery";
import { CONTACT_EMAIL } from "@/lib/site";
import { readAuthSecret, resendEnabled } from "@/lib/auth-env";
import { postResendEmail, type ResendAttachment } from "@/lib/resend-client";
import { ensureCloudflareContext } from "@/lib/runtime-env";
import { getAppUrl } from "@/lib/utils";

const DEFAULT_FROM = "InvoiceFlow Studio <noreply@invoiceflowstudio.com>";

export const CONTACT_RESEND_KEY_MISSING =
  "Contact email is not configured. Set AUTH_RESEND_KEY (or RESEND_API_KEY) as a Cloudflare Worker Runtime secret, plus EMAIL_FROM as a Runtime variable using a Resend-verified domain (e.g. InvoiceFlow Studio <noreply@invoiceflowstudio.com>). Optional CONTACT_TO overrides the inbox.";

export type ContactSendResult =
  | { sent: true; via: "resend" }
  | { sent: false; via: "log" | "resend"; reason: ContactSendReason };

async function resendRuntime() {
  await ensureCloudflareContext();
  const apiKey = readAuthSecret("AUTH_RESEND_KEY") || readAuthSecret("RESEND_API_KEY");
  const from = readAuthSecret("EMAIL_FROM") || DEFAULT_FROM;
  const to = resolveContactMailbox(readAuthSecret("CONTACT_TO"), readAuthSecret("CONTACT_EMAIL"), CONTACT_EMAIL);
  return { apiKey, from, to };
}

export async function sendMagicLinkEmail(identifier: string, url: string) {
  const { apiKey, from } = await resendRuntime();
  if (!apiKey) {
    console.info(`[InvoiceFlow] Magic link for ${identifier}: ${url}`);
    return;
  }
  const result = await postResendEmail({
    apiKey,
    from,
    to: identifier,
    subject: "Your InvoiceFlow sign-in link",
    html: `<p>Sign in to InvoiceFlow:</p><p><a href="${url}">${url}</a></p>`,
  });
  if (!result.sent) {
    console.error("sendMagicLinkEmail failed", result.error);
  }
}

export async function sendDocumentEmail(options: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  link: string;
}) {
  const { apiKey, from } = await resendRuntime();
  if (!apiKey) {
    console.info(
      `[InvoiceFlow] Email skipped (no Resend key). Would send to ${options.to}: ${options.subject} ${options.link}`,
    );
    return { sent: false as const };
  }
  const result = await postResendEmail({
    apiKey,
    from,
    to: options.to,
    subject: options.subject,
    html: `<p>${options.heading}</p><p>${options.body}</p><p><a href="${options.link}">Open document</a></p>`,
  });
  if (!result.sent) {
    console.error("sendDocumentEmail failed", result.error);
    return { sent: false as const };
  }
  return { sent: true as const };
}

export async function sendContactRequest(options: {
  email: string;
  topic: ContactTopic;
  subject: string;
  descriptionHtml: string;
  description: string;
  attachments?: ResendAttachment[];
}): Promise<ContactSendResult> {
  const { apiKey, from, to } = await resendRuntime();
  const html = `
    <p><strong>Topic:</strong> ${options.topic}</p>
    <p><strong>From:</strong> ${options.email}</p>
    <p><strong>Subject:</strong> ${options.subject}</p>
    ${options.descriptionHtml || `<p>${options.description}</p>`}
  `;

  if (!apiKey) {
    console.error(CONTACT_RESEND_KEY_MISSING);
    console.info("[InvoiceFlow] Contact request not emailed (no Resend key)", {
      topic: options.topic,
      subject: options.subject,
      email: options.email,
      to,
      files: options.attachments?.length ?? 0,
    });
    return { sent: false, via: "log", reason: "not_configured" };
  }

  const result = await postResendEmail({
    apiKey,
    from,
    to,
    replyTo: options.email,
    subject: `[InvoiceFlow] ${options.topic}: ${options.subject}`,
    html,
    text: options.description,
    attachments: options.attachments,
  });
  if (!result.sent) {
    const reason = classifyResendFailure(result.error);
    console.error("sendContactRequest failed", result.error, { reason, from, to });
    return { sent: false, via: "resend", reason };
  }
  return { sent: true, via: "resend" };
}

export function publicInvoiceUrl(token: string) {
  return `${getAppUrl()}/share/i/${token}`;
}

export function publicProposalUrl(token: string) {
  return `${getAppUrl()}/share/p/${token}`;
}

export { resendEnabled };
