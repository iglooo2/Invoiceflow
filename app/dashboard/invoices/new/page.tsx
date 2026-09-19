import { addDays, format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { InvoiceForm } from "@/components/invoice-form";
import { createInvoice } from "@/app/actions/invoices";
import { appCopy } from "@/lib/i18n-request";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { error } = await searchParams;
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  const today = new Date();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">{dict.app.newInvoice}</h1>
        <p className="text-muted-foreground">{dict.app.newInvoiceLede}</p>
      </div>
      <InvoiceForm
        action={createInvoice}
        formError={error}
        clients={clients}
        initial={{
          clientName: "",
          issueDate: format(today, "yyyy-MM-dd"),
          dueDate: format(addDays(today, 14), "yyyy-MM-dd"),
          taxRate: 0,
          status: "draft",
          items: [{ description: "", quantity: 1, rate: 0 }],
        }}
      />
    </div>
  );
}
