import { cookies } from "next/headers";
import { hasAuthjsSessionCookie } from "./auth-cookies";

/** Request-scoped signed-in hint from the session cookie, without Auth.js or Prisma. */
export async function hasSessionCookie() {
  const jar = await cookies();
  return hasAuthjsSessionCookie((name) => jar.get(name));
}