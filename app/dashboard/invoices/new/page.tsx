import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { CLIENT_PICKER_SELECT } from "@/lib/job-queries";
import { DOCUMENT_PICKER_TAKE } from "@/lib/query-limits";
import { requireUser } from "@/lib/session";
import { InvoiceForm } from "@/components/invoice-form";
import { createInvoice } from "@/app/actions/invoices";
import { appCopy } from "@/lib/i18n-request";
import { dueDateFromPaymentTerms } from "@/lib/studio-settings";
import { defaultContractDetails, defaultTaxPercent, loadStudioSettings } from "@/lib/studio-settings-store";

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
    select: CLIENT_PICKER_SELECT,
    orderBy: { name: "asc" },
    take: DOCUMENT_PICKER_TAKE,
  });
  const [{ settings }, taxRate, contractNotes] = await Promise.all([
    loadStudioSettings(user.id),
    defaultTaxPercent(user.id),
    defaultContractDetails(user.id, "invoice"),
  ]);
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
          dueDate: format(dueDateFromPaymentTerms(today, settings.paymentTermsDays), "yyyy-MM-dd"),
          taxRate,
          notes: contractNotes,
          status: "draft",
          items: [{ description: "", quantity: 1, rate: 0 }],
        }}
      />
    </div>
  );
}
