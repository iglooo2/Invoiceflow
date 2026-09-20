"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { registerFailureMessage, uniqueConstraintIncludes } from "@/lib/db-errors";
import { localizedPath } from "@/lib/i18n";
import { appCopy } from "@/lib/i18n-request";
import {
  composePhone,
  hasOnboardingProfile,
  isEmployeeCountKey,
  isIndustryKey,
  isValidPhone,
  joinName,
  needsOnboarding,
} from "@/lib/onboarding";
import { requireUser } from "@/lib/session";

const profileSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().optional(),
  countryIso: z.string().trim().min(2),
  nationalNumber: z.string().trim().min(1),
  consent: z.literal("on"),
});

const businessSchema = z.object({
  businessName: z.string().trim().min(1),
  employeeCount: z.string().refine(isEmployeeCountKey),
  industry: z.string().refine(isIndustryKey),
});

export async function saveOnboardingProfile(formData: FormData) {
  const user = await requireUser();
  const { locale, dict } = await appCopy();
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || "",
    countryIso: formData.get("countryIso"),
    nationalNumber: formData.get("nationalNumber"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "consent") return { error: dict.onboarding.errors.consent };
    if (field === "firstName") return { error: dict.onboarding.errors.firstName };
    return { error: dict.onboarding.errors.phone };
  }
  const phone = composePhone(parsed.data.countryIso, parsed.data.nationalNumber);
  if (!isValidPhone(phone)) {
    return { error: dict.onboarding.errors.phone };
  }
  const name = joinName(parsed.data.firstName, parsed.data.lastName ?? "");
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        phone,
        businessPhone: user.businessPhone || phone,
      },
    });
  } catch (error) {
    if (uniqueConstraintIncludes(error, "phone")) {
      return { error: dict.onboarding.errors.phoneTaken };
    }
    return { error: registerFailureMessage(error) };
  }
  redirect(localizedPath(locale, "/onboarding/business"));
}

export async function saveOnboardingBusiness(formData: FormData) {
  const user = await requireUser();
  const { locale, dict } = await appCopy();
  if (needsOnboarding(user) && !hasOnboardingProfile(user)) {
    redirect(localizedPath(locale, "/onboarding"));
  }
  const parsed = businessSchema.safeParse({
    businessName: formData.get("businessName"),
    employeeCount: formData.get("employeeCount"),
    industry: formData.get("industry"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "employeeCount") return { error: dict.onboarding.errors.employeeCount };
    if (field === "industry") return { error: dict.onboarding.errors.industry };
    return { error: dict.onboarding.errors.businessName };
  }
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        businessName: parsed.data.businessName,
        employeeCount: parsed.data.employeeCount,
        industry: parsed.data.industry,
        onboardingComplete: true,
      },
    });
  } catch (error) {
    return { error: registerFailureMessage(error) };
  }
  redirect("/dashboard");
}
