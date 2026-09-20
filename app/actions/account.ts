"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { prismaWriteFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { revalidateSettings, settingsRedirect } from "@/lib/settings-save";
import { requireUser } from "@/lib/session";
import { accountNameFromParts, parseAccountForm } from "@/lib/studio-settings";
import { upsertStudioSettings } from "@/lib/studio-settings-store";

export async function updateAccount(formData: FormData) {
  const user = await requireUser();
  const parsed = parseAccountForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/account", parsed.error));
  const data = parsed.data;
  if (data.email && data.email !== (user.email ?? "").toLowerCase()) {
    const taken = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: user.id } },
      select: { id: true },
    });
    if (taken) {
      redirect(settingsRedirect("/dashboard/settings/account", "That email is already in use."));
    }
  }
  const userPatch: {
    name: string | null;
    email?: string | null;
    passwordHash?: string;
  } = {
    name: accountNameFromParts(data.firstName, data.lastName, user.name),
  };
  if (data.email) userPatch.email = data.email;
  if (data.password) {
    const { default: bcrypt } = await import("bcryptjs");
    userPatch.passwordHash = await bcrypt.hash(data.password, 10);
  }
  try {
    await prisma.user.update({ where: { id: user.id }, data: userPatch });
  } catch (error) {
    console.error("updateAccount user", safeErrorLog(error));
    redirect(settingsRedirect("/dashboard/settings/account", prismaWriteFailureMessage(error)));
  }
  const saved = await upsertStudioSettings(user.id, {
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    defaultCurrency: data.defaultCurrency,
    documentLocale: data.documentLocale,
  });
  if (!saved.ok) redirect(settingsRedirect("/dashboard/settings/account", saved.error));
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/account", undefined, true));
}
