/**
 * Resend HTTP client for Cloudflare Workers.
 *
 * The Node SDK uses `fetch`, but JSON.stringify of Node `Buffer` attachments
 * and unbounded requests still hang workerd. Stripe in this repo already
 * uses Fetch + a timeout for the same reason.
 */

export const RESEND_API_URL = "https://api.resend.com/emails";

/** Fail before Cloudflare hung-worker cancellation (~30s). */
export const RESEND_REQUEST_TIMEOUT_MS = 15_000;

export type ResendAttachment = { filename: string; content: Uint8Array };

export type ResendSendResult = { sent: true } | { sent: false; error: string };

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function resendAttachmentPayload(file: ResendAttachment) {
  return { filename: file.filename, content: bytesToBase64(file.content) };
}

export async function postResendEmail(options: {
  apiKey: string;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: ResendAttachment[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<ResendSendResult> {
  const body: Record<string, unknown> = {
    from: options.from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
  };
  if (options.text) body.text = options.text;
  if (options.replyTo) body.reply_to = options.replyTo;
  if (options.attachments?.length) {
    body.attachments = options.attachments.map(resendAttachmentPayload);
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? RESEND_REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { sent: false, error: `Resend ${response.status}: ${text.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") {
      return { sent: false, error: "Resend request timed out" };
    }
    return { sent: false, error: error instanceof Error ? error.message : "Resend request failed" };
  } finally {
    clearTimeout(timer);
  }
}
