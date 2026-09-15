"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function updateStudio(formData: FormData) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: String(formData.get("name") || "") || null,
      businessName: String(formData.get("businessName") || "") || null,
      businessEmail: String(formData.get("businessEmail") || "") || null,
      businessPhone: String(formData.get("businessPhone") || "") || null,
      businessAddress: String(formData.get("businessAddress") || "") || null,
      website: String(formData.get("website") || "") || null,
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}
