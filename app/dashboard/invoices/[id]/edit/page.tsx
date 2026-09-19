import { format } from "date-fns";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { InvoiceForm } from "@/components/invoice-form";
import { updateInvoice } from "@/app/actions/invoices";
import { appCopy } from "@/lib/i18n-request";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { id } = await params;
  const [invoice, clients] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-4xl">{dict.app.edit} {invoice.number}</h1>
      <InvoiceForm
        action={updateInvoice.bind(null, invoice.id)}
        clients={clients}
        initial={{
          clientId: invoice.clientId,
          clientName: invoice.clientName,
          clientEmail: invoice.clientEmail,
          clientCompany: invoice.clientCompany,
          clientAddress: invoice.clientAddress,
          issueDate: format(invoice.issueDate, "yyyy-MM-dd"),
          dueDate: invoice.dueDate ? format(invoice.dueDate, "yyyy-MM-dd") : "",
          taxRate: invoice.taxRate,
          notes: invoice.notes,
          status: invoice.status,
          items: invoice.items,
        }}
      />
    </div>
  );
}
