import { handlers } from "@/lib/auth";
import { ensureAuthRuntimeEnv } from "@/lib/auth-env";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function withAuthRuntime(request: NextRequest, method: "GET" | "POST") {
  await ensureAuthRuntimeEnv();
  return handlers[method](request);
}

export async function GET(request: NextRequest) {
  return withAuthRuntime(request, "GET");
}

export async function POST(request: NextRequest) {
  return withAuthRuntime(request, "POST");
}
