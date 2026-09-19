"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
      phone: String(formData.get("businessPhone") || formData.get("phone") || "") || null,
      employeeCount: String(formData.get("employeeCount") || "") || null,
      industry: String(formData.get("industry") || "") || null,
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function requestQuickbooksConnect() {
  await requireUser();
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?qb=coming-soon");
}
