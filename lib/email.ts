import "server-only";
import { Resend } from "resend";
import type { ContactTopic } from "@/lib/contact";
import { CONTACT_EMAIL } from "@/lib/site";
import { readAuthSecret, resendEnabled } from "@/lib/auth-env";
import { getAppUrl, isDevMode } from "@/lib/utils";

function getResend() {
  const key = readAuthSecret("AUTH_RESEND_KEY") || readAuthSecret("RESEND_API_KEY");
  if (!key) return null;
  return new Resend(key);
}

export async function sendMagicLinkEmail(identifier: string, url: string) {
  const from = readAuthSecret("EMAIL_FROM") || "InvoiceFlow Studio <noreply@invoiceflowstudio.com>";
  const resend = getResend();
  if (!resend) {
    console.info(`[InvoiceFlow] Magic link for ${identifier}: ${url}`);
    return;
  }
  await resend.emails.send({
    from,
    to: identifier,
    subject: "Your InvoiceFlow sign-in link",
    html: `<p>Sign in to InvoiceFlow:</p><p><a href="${url}">${url}</a></p>`,
  });
}

export async function sendDocumentEmail(options: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  link: string;
}) {
  const resend = getResend();
  const from = readAuthSecret("EMAIL_FROM") || "InvoiceFlow Studio <noreply@invoiceflowstudio.com>";
  if (!resend) {
    console.info(
      `[InvoiceFlow] Email skipped (no Resend key). Would send to ${options.to}: ${options.subject} ${options.link}`,
    );
    return { sent: false as const };
  }
  await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: `<p>${options.heading}</p><p>${options.body}</p><p><a href="${options.link}">Open document</a></p>`,
  });
  return { sent: true as const };
}

export async function sendContactRequest(options: {
  email: string;
  topic: ContactTopic;
  subject: string;
  descriptionHtml: string;
  description: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const from = readAuthSecret("EMAIL_FROM") || "InvoiceFlow Studio <noreply@invoiceflowstudio.com>";
  const resend = getResend();
  const html = `
    <p><strong>Topic:</strong> ${options.topic}</p>
    <p><strong>From:</strong> ${options.email}</p>
    <p><strong>Subject:</strong> ${options.subject}</p>
    ${options.descriptionHtml || `<p>${options.description}</p>`}
  `;

  if (!resend) {
    console.info("[InvoiceFlow] Contact request stored locally (no Resend key)", {
      topic: options.topic,
      subject: options.subject,
      email: options.email,
      files: options.attachments?.length ?? 0,
    });
    return { sent: isDevMode(), via: "log" as const };
  }

  await resend.emails.send({
    from,
    to: CONTACT_EMAIL,
    replyTo: options.email,
    subject: `[InvoiceFlow] ${options.topic}: ${options.subject}`,
    html,
    attachments: options.attachments?.map((file) => ({
      filename: file.filename,
      content: file.content,
    })),
  });
  return { sent: true, via: "resend" as const };
}

export function publicInvoiceUrl(token: string) {
  return `${getAppUrl()}/share/i/${token}`;
}

export function publicProposalUrl(token: string) {
  return `${getAppUrl()}/share/p/${token}`;
}

export { resendEnabled };
