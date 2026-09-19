import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { countCreatedThisMonth } from "@/lib/documents";
import { formatCents, invoiceTotals } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { planFromUser, requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { createInvoiceFromTemplate } from "@/app/actions/invoices";
import { createProposalFromTemplate } from "@/app/actions/proposals";
import { appCopy } from "@/lib/i18n-request";
import { formatMessage } from "@/lib/i18n";

export default async function DashboardPage() {
  const user = await requireUser();
  const plan = planFromUser(user);
  const { dict } = await appCopy();
  const [invoices, proposals, invoiceCount, proposalCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.proposal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    countCreatedThisMonth(user.id, "invoice"),
    countCreatedThisMonth(user.id, "proposal"),
  ]);

  const outstanding = invoices
    .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoiceTotals(invoice.items, invoice.taxRate).totalCents, 0);

  return (
    <div className="grid gap-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl">{dict.app.home.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {plan === "pro"
              ? dict.app.home.proOn
              : formatMessage(dict.app.home.usage, {
                  invoices: invoiceCount,
                  invoiceLimit: PLANS.free.invoicesPerMonth,
                  proposals: proposalCount,
                  proposalLimit: PLANS.free.proposalsPerMonth,
                })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/invoices/new">{dict.app.newInvoice}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/proposals/new">{dict.app.newProposal}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label={dict.app.home.outstanding} value={formatCents(outstanding)} />
        <Stat label={dict.app.home.invoicesThisMonth} value={String(invoiceCount)} />
        <Stat label={dict.app.home.proposalsThisMonth} value={String(proposalCount)} />
      </div>

      <section>
        <h2 className="font-display text-2xl">{dict.app.home.startTemplate}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <form action={createInvoiceFromTemplate.bind(null, "design-project-invoice")}>
            <TemplateCard title={dict.app.home.tplDesignTitle} body={dict.app.home.tplDesignBody} />
          </form>
          <form action={createInvoiceFromTemplate.bind(null, "retainer-invoice")}>
            <TemplateCard title={dict.app.home.tplRetainerTitle} body={dict.app.home.tplRetainerBody} />
          </form>
          <form action={createProposalFromTemplate.bind(null, "video-edit-proposal")}>
            <TemplateCard title={dict.app.home.tplVideoTitle} body={dict.app.home.tplVideoBody} />
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">{dict.app.invoices}</h2>
            <Link href="/dashboard/invoices" className="text-sm text-primary">
              {dict.app.viewAll}
            </Link>
          </div>
          <div className="grid gap-2">
            {invoices.length === 0 ? <Empty text={dict.app.home.noInvoices} /> : null}
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/dashboard/invoices/${invoice.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium">{invoice.number}</p>
                  <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
                </div>
                <StatusBadge status={invoice.status} labels={dict.app.status} />
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-2xl">{dict.app.proposals}</h2>
            <Link href="/dashboard/proposals" className="text-sm text-primary">
              {dict.app.viewAll}
            </Link>
          </div>
          <div className="grid gap-2">
            {proposals.length === 0 ? <Empty text={dict.app.home.noProposals} /> : null}
            {proposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/dashboard/proposals/${proposal.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium">{proposal.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {proposal.clientName}
                    {proposal.validUntil ? ` · ${format(proposal.validUntil, "MMM d")}` : ""}
                  </p>
                </div>
                <StatusBadge status={proposal.status} labels={dict.app.status} />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper-card rounded-3xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
    </div>
  );
}

function TemplateCard({ title, body }: { title: string; body: string }) {
  return (
    <button type="submit" className="h-full w-full rounded-3xl border border-border bg-card p-5 text-left hover:border-primary">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">{text}</p>;
}
