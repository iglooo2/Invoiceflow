import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-request";
import { currentPlanId } from "@/lib/plans";

async function loginPath() {
  return localizedPath(await getRequestLocale(), "/login");
}

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect(await loginPath());
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect(await loginPath());
  return user;
});

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
});

export function studioName(user: {
  businessName?: string | null;
  name?: string | null;
  email?: string | null;
}) {
  return user.businessName || user.name || user.email || "Your studio";
}

export function planFromUser(user: {
  plan?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
}) {
  return currentPlanId(user);
}
