import "server-only";
import { prisma } from "@/lib/db";
import { isMissingDatabaseSchemaError, prismaWriteFailureMessage, safeErrorLog } from "@/lib/db-errors";
import {
  EMPTY_STUDIO_SETTINGS,
  SETTINGS_SCHEMA_WARNING,
  normalizeStudioSettings,
  type StudioSettingsRecord,
} from "@/lib/studio-settings";

export type LoadedStudioSettings = {
  settings: StudioSettingsRecord;
  missingSchema: boolean;
  warning?: string;
};

export async function loadStudioSettings(userId: string): Promise<LoadedStudioSettings> {
  try {
    const row = await prisma.studioSettings.findUnique({ where: { userId } });
    return {
      settings: row ? normalizeStudioSettings(row) : EMPTY_STUDIO_SETTINGS,
      missingSchema: false,
    };
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) {
      return { settings: EMPTY_STUDIO_SETTINGS, missingSchema: true, warning: SETTINGS_SCHEMA_WARNING };
    }
    throw error;
  }
}

export async function upsertStudioSettings(
  userId: string,
  data: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string; missingSchema?: boolean }> {
  const now = new Date();
  try {
    const existing = await prisma.studioSettings.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) {
      await prisma.studioSettings.update({
        where: { userId },
        data: { ...data, updatedAt: now },
      });
    } else {
      await prisma.studioSettings.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          createdAt: now,
          updatedAt: now,
          ...data,
        },
      });
    }
    return { ok: true };
  } catch (error) {
    console.error("upsertStudioSettings", safeErrorLog(error));
    if (isMissingDatabaseSchemaError(error)) {
      return { ok: false, error: SETTINGS_SCHEMA_WARNING, missingSchema: true };
    }
    return { ok: false, error: prismaWriteFailureMessage(error) };
  }
}

export type LoadedTaxRate = { id: string; name: string; rate: number };

export async function loadTaxRates(userId: string): Promise<{
  taxes: LoadedTaxRate[];
  missingSchema: boolean;
  warning?: string;
}> {
  try {
    const rows = await prisma.taxRate.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return {
      taxes: rows.map((row) => ({ id: row.id, name: row.name, rate: row.rate })),
      missingSchema: false,
    };
  } catch (error) {
    if (isMissingDatabaseSchemaError(error)) {
      return { taxes: [], missingSchema: true, warning: SETTINGS_SCHEMA_WARNING };
    }
    throw error;
  }
}

export async function defaultTaxPercent(userId: string) {
  const { taxes } = await loadTaxRates(userId);
  return taxes[0]?.rate ?? 0;
}

export async function withDocumentFooter<T extends object>(userId: string, studio: T) {
  const loaded = await loadStudioSettings(userId);
  return { ...studio, footerMessage: loaded.settings.footerMessage || null };
}
