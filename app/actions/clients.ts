"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

const clientSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function createClient(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") || "") || undefined,
    company: String(formData.get("company") || "") || undefined,
    address: String(formData.get("address") || "") || undefined,
    notes: String(formData.get("notes") || "") || undefined,
  });
  if (!parsed.success) {
    return;
  }
  await prisma.client.create({
    data: { ...parsed.data, userId: user.id },
  });
  revalidatePath("/dashboard/clients");
}

export async function deleteClient(clientId: string) {
  const user = await requireUser();
  await prisma.client.deleteMany({ where: { id: clientId, userId: user.id } });
  revalidatePath("/dashboard/clients");
}
