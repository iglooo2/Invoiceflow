import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentPlanId } from "@/lib/plans";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

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
