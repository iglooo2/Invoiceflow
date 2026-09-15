"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { planFromUser, requireUser } from "@/lib/session";
import { assertCanCreate, newPublicToken, nextInvoiceNumber, redirectIfLimitReached } from "@/lib/documents";
import { dollarsFromInput } from "@/lib/money";
import { SEED_TEMPLATES, type InvoiceTemplatePayload } from "@/lib/templates";
import { sendDocumentEmail, publicInvoiceUrl } from "@/lib/email";

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.number(),
});

const invoiceSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().optional(),
  clientCompany: z.string().optional(),
  clientAddress: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  taxRate: z.number().min(0).max(100),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
});

function parseInvoiceForm(formData: FormData) {
  const rawItems = formData.get("itemsJson");
  const items = rawItems ? JSON.parse(String(rawItems)) : [];
  return invoiceSchema.parse({
    clientId: String(formData.get("clientId") || "") || undefined,
    clientName: String(formData.get("clientName") || ""),
    clientEmail: String(formData.get("clientEmail") || "") || undefined,
    clientCompany: String(formData.get("clientCompany") || "") || undefined,
    clientAddress: String(formData.get("clientAddress") || "") || undefined,
    issueDate: String(formData.get("issueDate") || ""),
    dueDate: String(formData.get("dueDate") || "") || undefined,
    taxRate: dollarsFromInput(formData.get("taxRate") as string),
    notes: String(formData.get("notes") || "") || undefined,
    status: String(formData.get("status") || "draft"),
    items: (items as { description: string; quantity: string; rate: string }[]).map((item) => ({
      description: item.description,
      quantity: dollarsFromInput(item.quantity),
      rate: dollarsFromInput(item.rate),
    })),
  });
}

export async function createInvoice(formData: FormData) {
  const user = await requireUser();
  try {
    await assertCanCreate(user.id, planFromUser(user), "invoice");
  } catch (error) {
    redirectIfLimitReached(error);
  }
  const data = parseInvoiceForm(formData);
  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: data.clientId,
      number: await nextInvoiceNumber(user.id),
      status: data.status,
      issueDate: new Date(data.issueDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      taxRate: data.taxRate,
      notes: data.notes,
      publicToken: newPublicToken(),
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientCompany: data.clientCompany,
      clientAddress: data.clientAddress,
      items: {
        create: data.items.map((item, index) => ({
          ...item,
          sortOrder: index,
        })),
      },
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoice.id}`);
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: user.id },
  });
  if (!existing) throw new Error("Invoice not found");
  const data = parseInvoiceForm(formData);
  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        clientId: data.clientId,
        status: data.status,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        taxRate: data.taxRate,
        notes: data.notes,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientCompany: data.clientCompany,
        clientAddress: data.clientAddress,
        items: {
          create: data.items.map((item, index) => ({
            ...item,
            sortOrder: index,
          })),
        },
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  redirect(`/dashboard/invoices/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string) {
  const user = await requireUser();
  await prisma.invoice.deleteMany({ where: { id: invoiceId, userId: user.id } });
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function markInvoiceStatus(invoiceId: string, status: string) {
  const user = await requireUser();
  await prisma.invoice.updateMany({
    where: { id: invoiceId, userId: user.id },
    data: { status },
  });
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/invoices");
}

export async function createInvoiceFromTemplate(slug: string) {
  const user = await requireUser();
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
  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      number: await nextInvoiceNumber(user.id),
      status: "draft",
      issueDate: new Date(),
      dueDate: payload.dueInDays ? addDays(new Date(), payload.dueInDays) : addDays(new Date(), 14),
      taxRate: payload.taxRate ?? 0,
      notes: payload.notes,
      publicToken: newPublicToken(),
      clientName: "New client",
      items: {
        create: payload.items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          sortOrder: index,
        })),
      },
    },
  });
  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoice.id}/edit`);
}

export async function emailInvoice(invoiceId: string) {
  const user = await requireUser();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: user.id },
  });
  if (!invoice?.clientEmail) {
    return;
  }
  await sendDocumentEmail({
    to: invoice.clientEmail,
    subject: `Invoice ${invoice.number} from ${user.businessName || user.name || "your freelancer"}`,
    heading: `Invoice ${invoice.number}`,
    body: "Here’s a link to view and download the invoice.",
    link: publicInvoiceUrl(invoice.publicToken),
  });
  if (invoice.status === "draft") {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "sent" } });
  }
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
}
