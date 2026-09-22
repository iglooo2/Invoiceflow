"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { addDays } from "date-fns";
import { databaseRuntimeStatus, prisma } from "@/lib/db";
import { documentWriteFailureMessage, errorRedirect, safeErrorLog } from "@/lib/db-errors";
import { insertInvoiceWithItems, replaceInvoiceItems } from "@/lib/document-writes";
import { parseInvoiceForm, parseInvoiceIdForm, parseInvoiceStatusForm } from "@/lib/invoice-input";
import { planFromUser, requireUser } from "@/lib/session";
import { assertCanCreate, newPublicToken, nextInvoiceNumber, redirectIfLimitReached } from "@/lib/documents";
import { SEED_TEMPLATES, type InvoiceTemplatePayload } from "@/lib/templates";
import { sendDocumentEmail, publicInvoiceUrl } from "@/lib/email";
import { appCopy } from "@/lib/i18n-request";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export type InvoiceActionResult = { error: string };

async function revalidateInvoicePaths(invoiceId?: string) {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/invoices");
    if (invoiceId) revalidatePath(`/dashboard/invoices/${invoiceId}`);
  } catch (error) {
    console.error("invoice revalidatePath", safeErrorLog(error));
  }
}

export async function createInvoice(formData: FormData): Promise<InvoiceActionResult | void> {
  const user = await requireUser();
  let invoiceId: string;
  try {
    try {
      await assertCanCreate(user.id, planFromUser(user), "invoice");
    } catch (error) {
      redirectIfLimitReached(error);
    }
    const parsed = parseInvoiceForm(formData);
    if (!parsed.success) return { error: parsed.error };
    const settings = await loadStudioSettings(user.id);
    const invoice = await insertInvoiceWithItems(
      prisma,
      {
        userId: user.id,
        clientId: parsed.data.clientId,
        number: await nextInvoiceNumber(user.id),
        status: parsed.data.status,
        issueDate: new Date(parsed.data.issueDate),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        taxRate: parsed.data.taxRate,
        notes: parsed.data.notes,
        publicToken: newPublicToken(),
        clientName: parsed.data.clientName,
        clientEmail: parsed.data.clientEmail,
        clientCompany: parsed.data.clientCompany,
        clientAddress: parsed.data.clientAddress,
        currency: settings.settings.defaultCurrency,
      },
      parsed.data.items,
    );
    invoiceId = invoice.id;
  } catch (error) {
    unstable_rethrow(error);
    console.error("createInvoice failed", safeErrorLog(error), databaseRuntimeStatus());
    return { error: documentWriteFailureMessage(error) };
  }
  await revalidateInvoicePaths();
  redirect(`/dashboard/invoices/${invoiceId}`);
}

export async function updateInvoice(
  invoiceId: string,
  formData: FormData,
): Promise<InvoiceActionResult | void> {
  const user = await requireUser();
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id },
    });
    if (!existing) {
      const { dict } = await appCopy();
      return { error: dict.app.errors.invoiceNotFound };
    }
    const parsed = parseInvoiceForm(formData);
    if (!parsed.success) return { error: parsed.error };
    await replaceInvoiceItems(
      prisma,
      invoiceId,
      {
        clientId: parsed.data.clientId,
        status: parsed.data.status,
        issueDate: new Date(parsed.data.issueDate),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        taxRate: parsed.data.taxRate,
        notes: parsed.data.notes,
        clientName: parsed.data.clientName,
        clientEmail: parsed.data.clientEmail,
        clientCompany: parsed.data.clientCompany,
        clientAddress: parsed.data.clientAddress,
      },
      parsed.data.items,
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("updateInvoice failed", safeErrorLog(error), databaseRuntimeStatus());
    return { error: documentWriteFailureMessage(error) };
  }
  await revalidateInvoicePaths(invoiceId);
  redirect(`/dashboard/invoices/${invoiceId}`);
}

export async function deleteInvoice(formData: FormData) {
  const user = await requireUser();
  const parsed = parseInvoiceIdForm(formData);
  if (!parsed.success) {
    redirect(errorRedirect("/dashboard/invoices", parsed.error));
  }
  const invoiceId = parsed.data.invoiceId;
  try {
    await prisma.invoice.deleteMany({ where: { id: invoiceId, userId: user.id } });
  } catch (error) {
    unstable_rethrow(error);
    console.error("deleteInvoice failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect(`/dashboard/invoices/${invoiceId}`, documentWriteFailureMessage(error)));
  }
  await revalidateInvoicePaths();
  redirect("/dashboard/invoices");
}

/**
 * FormData-only (no `.bind` args). OpenNext on Workers has crashed when a
 * server action was invoked with two bound arguments plus the implicit
 * FormData, and the previous implementation then called `revalidatePath`
 * without a redirect — any throw became Cloudflare's generic Worker page.
 */
export async function markInvoiceStatus(formData: FormData) {
  const user = await requireUser();
  const parsed = parseInvoiceStatusForm(formData);
  const invoiceId = parsed.success ? parsed.data.invoiceId : String(formData.get("invoiceId") || "");
  const detailPath = invoiceId ? `/dashboard/invoices/${invoiceId}` : "/dashboard/invoices";
  if (!parsed.success) {
    redirect(errorRedirect(detailPath, parsed.error));
  }
  try {
    const existing = await prisma.invoice.findFirst({
      where: { id: parsed.data.invoiceId, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      redirect(errorRedirect("/dashboard/invoices", "Invoice not found."));
    }
    await prisma.invoice.update({
      where: { id: existing.id },
      data: { status: parsed.data.status },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("markInvoiceStatus failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect(detailPath, documentWriteFailureMessage(error)));
  }
  await revalidateInvoicePaths(parsed.data.invoiceId);
  redirect(`/dashboard/invoices/${parsed.data.invoiceId}`);
}

export async function createInvoiceFromTemplate(slug: string) {
  const user = await requireUser();
  try {
    try {
      await assertCanCreate(user.id, planFromUser(user), "invoice");
    } catch (error) {
      redirectIfLimitReached(error);
    }
    const template =
      (await prisma.documentTemplate.findUnique({ where: { slug } })) ??
      SEED_TEMPLATES.find((item) => item.slug === slug);
    if (!template || template.kind !== "invoice") {
      throw new Error("Template not found");
    }
    const payload = template.payload as InvoiceTemplatePayload;
    const settings = await loadStudioSettings(user.id);
    const invoice = await insertInvoiceWithItems(
      prisma,
      {
        userId: user.id,
        number: await nextInvoiceNumber(user.id),
        status: "draft",
        issueDate: new Date(),
        dueDate: payload.dueInDays ? addDays(new Date(), payload.dueInDays) : addDays(new Date(), 14),
        taxRate: payload.taxRate ?? 0,
        notes: payload.notes,
        publicToken: newPublicToken(),
        clientName: "New client",
        currency: settings.settings.defaultCurrency,
      },
      payload.items,
    );
    await revalidateInvoicePaths();
    redirect(`/dashboard/invoices/${invoice.id}/edit`);
  } catch (error) {
    unstable_rethrow(error);
    console.error("createInvoiceFromTemplate failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect("/dashboard/invoices/new", documentWriteFailureMessage(error)));
  }
}

export async function emailInvoice(formData: FormData) {
  const user = await requireUser();
  const parsed = parseInvoiceIdForm(formData);
  if (!parsed.success) {
    redirect(errorRedirect("/dashboard/invoices", parsed.error));
  }
  const invoiceId = parsed.data.invoiceId;
  const detailPath = `/dashboard/invoices/${invoiceId}`;
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId: user.id },
    });
    if (!invoice) {
      const { dict } = await appCopy();
      redirect(errorRedirect("/dashboard/invoices", dict.app.errors.invoiceNotFound));
    }
    if (!invoice.clientEmail) {
      const { dict } = await appCopy();
      redirect(errorRedirect(detailPath, dict.app.errors.clientEmailRequired));
    }
    const delivery = await sendDocumentEmail({
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.number} from ${user.businessName || user.name || "your freelancer"}`,
      heading: `Invoice ${invoice.number}`,
      body: (await loadStudioSettings(user.id)).settings.emailInvoiceMessage,
      link: publicInvoiceUrl(invoice.publicToken),
    });
    if (!delivery.sent) {
      const { dict } = await appCopy();
      redirect(
        errorRedirect(
          detailPath,
          delivery.reason === "not_configured"
            ? dict.app.errors.emailNotConfigured
            : dict.app.errors.emailDeliveryFailed,
        ),
      );
    }
    if (invoice.status === "draft") {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "sent" } });
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("emailInvoice failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect(detailPath, documentWriteFailureMessage(error)));
  }
  await revalidateInvoicePaths(invoiceId);
  redirect(detailPath);
}
