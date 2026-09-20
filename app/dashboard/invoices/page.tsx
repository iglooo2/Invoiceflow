import Link from "next/link";
import { prisma } from "@/lib/db";
import { csvExportHref, invoiceListWhere, parseListFilters } from "@/lib/csv";
import { DASHBOARD_LIST_TAKE } from "@/lib/query-limits";
import { formatCents, invoiceTotals } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { appCopy } from "@/lib/i18n-request";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const filters = parseListFilters(await searchParams);
  const { status, q } = filters;
  const invoices = await prisma.invoice.findMany({
    where: invoiceListWhere(user.id, filters),
    select: {
      id: true,
      number: true,
      clientName: true,
      status: true,
      currency: true,
      taxRate: true,
      items: { select: { quantity: true, rate: true } },
    },
    orderBy: { createdAt: "desc" },
    take: DASHBOARD_LIST_TAKE,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl">{dict.app.invoices}</h1>
          <p className="text-muted-foreground">{dict.app.invoiceList.lede}</p>
        </div>
        <div className="btn-row">
          <Button asChild variant="outline">
            <a href={csvExportHref("invoices", filters)}>{dict.app.exportCsv}</a>
          </Button>
          <Button asChild>
            <Link href="/dashboard/invoices/new">{dict.app.newInvoice}</Link>
          </Button>
        </div>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input name="q" placeholder={dict.app.search} defaultValue={q} className="min-w-0 sm:flex-1" />
        <Select name="status" defaultValue={status || ""} className="min-w-0 sm:max-w-48">
          <option value="">{dict.app.allStatuses}</option>
          <option value="draft">{dict.app.status.draft}</option>
          <option value="sent">{dict.app.status.sent}</option>
          <option value="paid">{dict.app.status.paid}</option>
          <option value="overdue">{dict.app.status.overdue}</option>
          <option value="void">{dict.app.status.void}</option>
        </Select>
        <Button type="submit" variant="outline" className="w-full sm:w-auto">
          {dict.app.filter}
        </Button>
      </form>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">{dict.app.invoiceList.number}</th>
              <th className="px-4 py-3 font-medium">{dict.app.invoiceList.client}</th>
              <th className="px-4 py-3 font-medium">{dict.app.invoiceList.status}</th>
              <th className="px-4 py-3 font-medium">{dict.app.invoiceList.total}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-border/70">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/invoices/${invoice.id}`} className="font-medium">
                    {invoice.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{invoice.clientName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} labels={dict.app.status} />
                </td>
                <td className="px-4 py-3">
                  {formatCents(invoiceTotals(invoice.items, invoice.taxRate).totalCents, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">{dict.app.invoiceList.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
