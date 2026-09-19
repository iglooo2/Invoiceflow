import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCents, proposalTotalCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { appCopy } from "@/lib/i18n-request";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { status, q } = await searchParams;
  const proposals = await prisma.proposal.findMany({
    where: {
      userId: user.id,
      status: status || undefined,
      OR: q
        ? [{ title: { contains: q } }, { clientName: { contains: q } }]
        : undefined,
    },
    include: { sections: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl">{dict.app.proposals}</h1>
          <p className="text-muted-foreground">{dict.app.proposalList.lede}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/proposals/new">{dict.app.newProposal}</Link>
        </Button>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" placeholder={dict.app.search} defaultValue={q} />
        <Select name="status" defaultValue={status || ""}>
          <option value="">{dict.app.allStatuses}</option>
          <option value="draft">{dict.app.status.draft}</option>
          <option value="sent">{dict.app.status.sent}</option>
          <option value="accepted">{dict.app.status.accepted}</option>
          <option value="declined">{dict.app.status.declined}</option>
        </Select>
        <Button type="submit" variant="outline">
          {dict.app.filter}
        </Button>
      </form>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">{dict.app.proposalList.title}</th>
              <th className="px-4 py-3 font-medium">{dict.app.proposalList.client}</th>
              <th className="px-4 py-3 font-medium">{dict.app.proposalList.status}</th>
              <th className="px-4 py-3 font-medium">{dict.app.proposalList.investment}</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => (
              <tr key={proposal.id} className="border-b border-border/70">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/proposals/${proposal.id}`} className="font-medium">
                    {proposal.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{proposal.clientName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={proposal.status} labels={dict.app.status} />
                </td>
                <td className="px-4 py-3">
                  {formatCents(proposalTotalCents(proposal.sections), proposal.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {proposals.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">{dict.app.proposalList.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
