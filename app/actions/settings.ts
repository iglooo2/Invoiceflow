"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isMissingDatabaseSchemaError, prismaWriteFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { requireUser } from "@/lib/session";
import { SETTINGS_SCHEMA_WARNING } from "@/lib/studio-settings";
import { loadStudioSettings, upsertStudioSettings } from "@/lib/studio-settings-store";
import {
  accountNameFromParts,
  fileFromForm,
  fileToStoredUpload,
  parseAccountForm,
  parseCompanyForm,
  parseDocumentsForm,
  parseLinksForm,
  parseMarkupForm,
  parsePreferencesForm,
  parseTaxForm,
} from "@/lib/studio-settings";

function keepUpload(clear: boolean, next?: { name?: string; dataUrl: string } | null, previousName = "", previousData = "") {
  if (clear) return { name: null as string | null, dataUrl: null as string | null };
  return {
    name: next?.name || previousName || null,
    dataUrl: next?.dataUrl || previousData || null,
  };
}

function settingsRedirect(path: string, error?: string, saved?: boolean) {
  const params = new URLSearchParams();
  if (error) params.set("error", error);
  if (saved) params.set("saved", "1");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function revalidateSettings() {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings", "layout");
  } catch (error) {
    console.error("settings revalidatePath", safeErrorLog(error));
  }
}

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

export async function updateCompany(formData: FormData) {
  const user = await requireUser();
  const parsed = parseCompanyForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/company", parsed.error));
  const data = parsed.data;
  const logo = await fileToStoredUpload(fileFromForm(formData, "logoFile"), "image");
  if (!logo.success) redirect(settingsRedirect("/dashboard/settings/company", logo.error));
  const existing = await loadStudioSettings(user.id);
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        businessName: data.businessName || null,
        businessPhone: data.businessPhone || null,
        businessEmail: data.businessEmail || null,
        website: data.website || null,
        businessAddress: data.businessAddress || null,
        phone: data.businessPhone || user.phone || null,
        employeeCount: data.employeeCount || null,
        industry: data.industry || null,
      },
    });
  } catch (error) {
    console.error("updateCompany user", safeErrorLog(error));
    redirect(settingsRedirect("/dashboard/settings/company", prismaWriteFailureMessage(error)));
  }
  const saved = await upsertStudioSettings(user.id, {
    businessPhone2: data.businessPhone2 || null,
    businessFax: data.businessFax || null,
    addressLine1: data.addressLine1 || null,
    addressLine2: data.addressLine2 || null,
    city: data.city || null,
    region: data.region || null,
    country: data.country || null,
    postalCode: data.postalCode || null,
    taxNumber: data.taxNumber || null,
    industry: data.industry || null,
    logoDataUrl: keepUpload(data.clearLogo, logo.data, "", existing.settings.logoDataUrl).dataUrl,
  });
  if (!saved.ok) redirect(settingsRedirect("/dashboard/settings/company", saved.error));
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/company", undefined, true));
}

export async function updateLinks(formData: FormData) {
  const user = await requireUser();
  const parsed = parseLinksForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/links", parsed.error));
  const data = parsed.data;
  const license = await fileToStoredUpload(fileFromForm(formData, "licenseFile"), "document");
  const insurance = await fileToStoredUpload(fileFromForm(formData, "insuranceFile"), "document");
  if (!license.success) redirect(settingsRedirect("/dashboard/settings/links", license.error));
  if (!insurance.success) redirect(settingsRedirect("/dashboard/settings/links", insurance.error));
  const existing = await loadStudioSettings(user.id);
  try {
    if (data.website !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { website: data.website || null },
      });
    }
  } catch (error) {
    console.error("updateLinks user", safeErrorLog(error));
    redirect(settingsRedirect("/dashboard/settings/links", prismaWriteFailureMessage(error)));
  }
  const licenseFile = keepUpload(
    data.clearLicense,
    license.data,
    existing.settings.licenseFileName,
    existing.settings.licenseDataUrl,
  );
  const insuranceFile = keepUpload(
    data.clearInsurance,
    insurance.data,
    existing.settings.insuranceFileName,
    existing.settings.insuranceDataUrl,
  );
  const saved = await upsertStudioSettings(user.id, {
    facebookUrl: data.facebookUrl || null,
    googleBusinessUrl: data.googleBusinessUrl || null,
    instagramUrl: data.instagramUrl || null,
    yelpUrl: data.yelpUrl || null,
    licenseFileName: licenseFile.name,
    licenseDataUrl: licenseFile.dataUrl,
    insuranceFileName: insuranceFile.name,
    insuranceDataUrl: insuranceFile.dataUrl,
  });
  if (!saved.ok) redirect(settingsRedirect("/dashboard/settings/links", saved.error));
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/links", undefined, true));
}

export async function updatePreferences(formData: FormData) {
  const user = await requireUser();
  const parsed = parsePreferencesForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/preferences", parsed.error));
  const saved = await upsertStudioSettings(user.id, parsed.data);
  if (!saved.ok) redirect(settingsRedirect("/dashboard/settings/preferences", saved.error));
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/preferences", undefined, true));
}

export async function updateDocuments(formData: FormData) {
  const user = await requireUser();
  const parsed = parseDocumentsForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/documents", parsed.error));
  const saved = await upsertStudioSettings(user.id, parsed.data);
  if (!saved.ok) redirect(settingsRedirect("/dashboard/settings/documents", saved.error));
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/documents", undefined, true));
}

export async function updateMarkup(formData: FormData) {
  const user = await requireUser();
  const parsed = parseMarkupForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/markup", parsed.error));
  const saved = await upsertStudioSettings(user.id, parsed.data);
  if (!saved.ok) redirect(settingsRedirect("/dashboard/settings/markup", saved.error));
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/markup", undefined, true));
}

export async function createTax(formData: FormData) {
  const user = await requireUser();
  const parsed = parseTaxForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/taxes", parsed.error));
  const now = new Date();
  try {
    await prisma.taxRate.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        name: parsed.data.name,
        rate: parsed.data.rate,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error("createTax", safeErrorLog(error));
    const message = isMissingDatabaseSchemaError(error)
      ? SETTINGS_SCHEMA_WARNING
      : prismaWriteFailureMessage(error);
    redirect(settingsRedirect("/dashboard/settings/taxes", message));
  }
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/taxes", undefined, true));
}

export async function deleteTax(formData: FormData) {
  const user = await requireUser();
  const taxId = String(formData.get("taxId") || "");
  if (!taxId) redirect(settingsRedirect("/dashboard/settings/taxes", "Tax is missing."));
  try {
    await prisma.taxRate.deleteMany({ where: { id: taxId, userId: user.id } });
  } catch (error) {
    console.error("deleteTax", safeErrorLog(error));
    redirect(settingsRedirect("/dashboard/settings/taxes", prismaWriteFailureMessage(error)));
  }
  await revalidateSettings();
  redirect("/dashboard/settings/taxes");
}

export async function requestQuickbooksConnect() {
  await requireUser();
  revalidatePath("/dashboard/settings/quickbooks");
  redirect("/dashboard/settings/quickbooks?qb=coming-soon");
}
