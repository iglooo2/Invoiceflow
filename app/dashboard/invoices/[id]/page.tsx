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

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
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
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <CopyLinkButton value={share} />
          <Button asChild variant="outline">
            <a href={`/api/invoices/${invoice.id}/pdf`}>Download PDF</a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/share/i/${invoice.publicToken}`}>Public view</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/invoices/${invoice.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>
      {error ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p> : null}
      <div className="no-print flex flex-wrap gap-2">
        <form action={emailInvoice}>
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <Button type="submit" variant="secondary">
            Email share link
          </Button>
        </form>
        {invoice.status !== "paid" ? (
          <form action={markInvoiceStatus}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="status" value="paid" />
            <Button type="submit" variant="outline">
              Mark paid
            </Button>
          </form>
        ) : null}
        <form action={deleteInvoice}>
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <Button type="submit" variant="ghost">
            Delete
          </Button>
        </form>
      </div>
      <InvoicePreview studio={user} invoice={invoice} branded={currentPlanId(user) !== "pro"} />
    </div>
  );
}
