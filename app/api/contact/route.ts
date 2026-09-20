import { NextResponse } from "next/server";
import { submitContactRequest } from "@/app/actions/contact";
import { appCopy } from "@/lib/i18n-request";
import { safeErrorLog } from "@/lib/db-errors";

/**
 * Contact submit must be a Route Handler. OpenNext on Cloudflare can hang
 * indefinitely on Server Action POSTs (`Next-Action` + multipart FormData)
 * before the action runs, so the marketing form stays on "Sending…".
 * `request.formData()` on this path completes.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { dict } = await appCopy();
  try {
    const formData = await request.formData();
    const result = await submitContactRequest(formData);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("POST /api/contact failed", safeErrorLog(error));
    return NextResponse.json({ ok: false, error: dict.contact.error }, { status: 500 });
  }
}
