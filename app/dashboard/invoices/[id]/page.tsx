import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { publicInvoiceUrl } from "@/lib/email";
import { currentPlanId } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { InvoicePreview } from "@/components/document-preview";
import { StatusBadge } from "@/components/status-badge";
import { deleteInvoice, emailInvoice, markInvoiceStatus } from "@/app/actions/invoices";
import { appCopy } from "@/lib/i18n-request";
import { withDocumentFooter } from "@/lib/studio-settings-store";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { id } = await params;
  const { error } = await searchParams;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) notFound();
  const share = publicInvoiceUrl(invoice.publicToken);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm text-muted-foreground">{invoice.number}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl">{invoice.clientName}</h1>
            <StatusBadge status={invoice.status} labels={dict.app.status} />
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <CopyLinkButton value={share} label={dict.app.copyLink} copiedLabel={dict.app.copied} />
          <Button asChild variant="outline">
            <a href={`/api/invoices/${invoice.id}/pdf`}>{dict.app.downloadPdf}</a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/share/i/${invoice.publicToken}`}>{dict.app.publicView}</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/invoices/${invoice.id}/edit`}>{dict.app.edit}</Link>
          </Button>
        </div>
      </div>
      {error ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p> : null}
      <div className="no-print flex flex-wrap gap-2">
        <form action={emailInvoice}>
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <Button type="submit" variant="secondary">
            {dict.app.emailShareLink}
          </Button>
        </form>
        {invoice.status !== "paid" ? (
          <form action={markInvoiceStatus}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="status" value="paid" />
            <Button type="submit" variant="outline">
              {dict.app.markPaid}
            </Button>
          </form>
        ) : null}
        <form action={deleteInvoice}>
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <Button type="submit" variant="ghost">
            {dict.app.delete}
          </Button>
        </form>
      </div>
      <InvoicePreview studio={await withDocumentFooter(user.id, user)} invoice={invoice} branded={currentPlanId(user) !== "pro"} />
    </div>
  );
}
