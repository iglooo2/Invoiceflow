"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isMissingDatabaseSchemaError, prismaWriteFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { revalidateSettings, settingsRedirect } from "@/lib/settings-save";
import { requireUser } from "@/lib/session";
import { newReferralCode } from "@/lib/referrals";
import { EMPTY_STUDIO_SETTINGS, SETTINGS_SCHEMA_WARNING } from "@/lib/studio-settings";
import { loadStudioSettings, upsertStudioSettings } from "@/lib/studio-settings-store";
import {
  fileFromForm,
  fileToStoredUpload,
  parseCompanyForm,
  parseContractForm,
  parseDocumentsForm,
  parseLinksForm,
  parseMarkupForm,
  parsePreferencesForm,
  parseReferralGenerateForm,
  parseTaxForm,
} from "@/lib/studio-settings";

function keepUpload(clear: boolean, next?: { name?: string; dataUrl: string } | null, previousName = "", previousData = "") {
  if (clear) return { name: null as string | null, dataUrl: null as string | null };
  return {
    name: next?.name || previousName || null,
    dataUrl: next?.dataUrl || previousData || null,
  };
}

export async function updateCompany(formData: FormData) {
  const user = await requireUser();
  const parsed = parseCompanyForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/company", parsed.error));
  const data = parsed.data;
  const logo = await fileToStoredUpload(fileFromForm(formData, "logoFile"), "image");
  if (!logo.success) redirect(settingsRedirect("/dashboard/settings/company", logo.error));
  const keepPreviousLogo = !data.clearLogo && !logo.data;
  const existing = keepPreviousLogo
    ? await loadStudioSettings(user.id, { uploads: "logo" })
    : { settings: EMPTY_STUDIO_SETTINGS };
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
  const needDocs = (!data.clearLicense && !license.data) || (!data.clearInsurance && !insurance.data);
  const existing = needDocs
    ? await loadStudioSettings(user.id, { uploads: "docs" })
    : { settings: EMPTY_STUDIO_SETTINGS };
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

async function clearOtherDefaultContracts(
  userId: string,
  exceptId: string,
  flags: { defaultForEstimates: boolean; defaultForInvoices: boolean },
) {
  if (flags.defaultForEstimates) {
    await prisma.contract.updateMany({
      where: { userId, defaultForEstimates: true, NOT: { id: exceptId } },
      data: { defaultForEstimates: false },
    });
  }
  if (flags.defaultForInvoices) {
    await prisma.contract.updateMany({
      where: { userId, defaultForInvoices: true, NOT: { id: exceptId } },
      data: { defaultForInvoices: false },
    });
  }
}

export async function saveContract(formData: FormData) {
  const user = await requireUser();
  const parsed = parseContractForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/contracts", parsed.error));
  const now = new Date();
  const id = parsed.data.id || crypto.randomUUID();
  try {
    const existing = parsed.data.id
      ? await prisma.contract.findFirst({ where: { id: parsed.data.id, userId: user.id }, select: { id: true } })
      : null;
    if (existing) {
      await prisma.contract.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          details: parsed.data.details,
          defaultForEstimates: parsed.data.defaultForEstimates,
          defaultForInvoices: parsed.data.defaultForInvoices,
          updatedAt: now,
        },
      });
      await clearOtherDefaultContracts(user.id, existing.id, parsed.data);
    } else {
      await prisma.contract.create({
        data: {
          id,
          userId: user.id,
          name: parsed.data.name,
          details: parsed.data.details,
          defaultForEstimates: parsed.data.defaultForEstimates,
          defaultForInvoices: parsed.data.defaultForInvoices,
          createdAt: now,
          updatedAt: now,
        },
      });
      await clearOtherDefaultContracts(user.id, id, parsed.data);
    }
  } catch (error) {
    console.error("saveContract", safeErrorLog(error));
    const message = isMissingDatabaseSchemaError(error)
      ? SETTINGS_SCHEMA_WARNING
      : prismaWriteFailureMessage(error);
    redirect(settingsRedirect("/dashboard/settings/contracts", message));
  }
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/contracts", undefined, true));
}

export async function deleteContract(formData: FormData) {
  const user = await requireUser();
  const contractId = String(formData.get("contractId") || "");
  if (!contractId) redirect(settingsRedirect("/dashboard/settings/contracts", "Contract is missing."));
  try {
    await prisma.contract.deleteMany({ where: { id: contractId, userId: user.id } });
  } catch (error) {
    console.error("deleteContract", safeErrorLog(error));
    redirect(settingsRedirect("/dashboard/settings/contracts", prismaWriteFailureMessage(error)));
  }
  await revalidateSettings();
  redirect("/dashboard/settings/contracts");
}

export async function generateReferralLink(formData: FormData) {
  const user = await requireUser();
  const parsed = parseReferralGenerateForm(formData);
  if (!parsed.success) redirect(settingsRedirect("/dashboard/settings/refer", parsed.error));
  const loaded = await loadStudioSettings(user.id);
  const existingCode = loaded.settings.referralCode.trim();
  const code = existingCode || newReferralCode();
  const saved = await upsertStudioSettings(user.id, {
    referralCode: code,
    referralTermsAcceptedAt: new Date(),
  });
  if (!saved.ok) redirect(settingsRedirect("/dashboard/settings/refer", saved.error));
  await revalidateSettings();
  redirect(settingsRedirect("/dashboard/settings/refer", undefined, true));
}

export async function requestQuickbooksConnect() {
  await requireUser();
  revalidatePath("/dashboard/settings/quickbooks");
  redirect("/dashboard/settings/quickbooks?qb=coming-soon");
}
