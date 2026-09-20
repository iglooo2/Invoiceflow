import "server-only";
import { revalidatePath } from "next/cache";
import { safeErrorLog } from "@/lib/db-errors";

export function settingsRedirect(path: string, error?: string, saved?: boolean) {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (saved) params.set("saved", "1");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export async function revalidateSettings() {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings", "layout");
  } catch (error) {
    console.error("settings revalidatePath", safeErrorLog(error));
  }
}
