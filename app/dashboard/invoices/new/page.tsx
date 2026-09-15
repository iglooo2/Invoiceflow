import { addDays, format } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { InvoiceForm } from "@/components/invoice-form";
import { createInvoice } from "@/app/actions/invoices";

export default async function NewInvoicePage() {
  const user = await requireUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  const today = new Date();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">New invoice</h1>
        <p className="text-muted-foreground">Blank slate. Or go back and start from a template.</p>
      </div>
      <InvoiceForm
        action={createInvoice}
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
