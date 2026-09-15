import "server-only";
import { Resend } from "resend";
import { getAppUrl, resendEnabled } from "@/lib/utils";

function getResend() {
  const key = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendMagicLinkEmail(identifier: string, url: string) {
  const from = process.env.EMAIL_FROM || "InvoiceFlow <noreply@localhost>";
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
  const from = process.env.EMAIL_FROM || "InvoiceFlow <noreply@localhost>";
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

export function publicInvoiceUrl(token: string) {
  return `${getAppUrl()}/share/i/${token}`;
}

export function publicProposalUrl(token: string) {
  return `${getAppUrl()}/share/p/${token}`;
}

export { resendEnabled };
