import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { parseAttachmentsJson, ESTIMATE_NEW_PATH, estimateDetailPath } from "@/lib/estimates";
import { appCopy } from "@/lib/i18n-request";
import { formatMessage } from "@/lib/i18n";
import { estimateTotals, formatCents } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { status, q } = await searchParams;
  const copy = dict.app.estimateList;
  const estimates = await prisma.proposal.findMany({
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
          <h1 className="font-display text-4xl">{dict.app.estimates}</h1>
          <p className="text-muted-foreground">{copy.lede}</p>
        </div>
        <Button asChild>
          <Link href={ESTIMATE_NEW_PATH}>{dict.app.newEstimate}</Link>
        </Button>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" placeholder={dict.app.search} defaultValue={q} />
        <Select name="status" defaultValue={status || ""}>
          <option value="">{dict.app.allStatuses}</option>
          <option value="draft">{dict.app.status.draft}</option>
          <option value="sent">{dict.app.status.sent}</option>
          <option value="accepted">{dict.app.status.approved}</option>
          <option value="declined">{dict.app.status.declined}</option>
        </Select>
        <Button type="submit" variant="outline">
          {dict.app.filter}
        </Button>
      </form>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">{copy.title}</th>
              <th className="px-4 py-3 font-medium">{copy.client}</th>
              <th className="px-4 py-3 font-medium">{copy.status}</th>
              <th className="px-4 py-3 font-medium">{copy.opened}</th>
              <th className="px-4 py-3 font-medium">{copy.total}</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((estimate) => {
              const totals = estimateTotals(estimate.sections, estimate.taxRate, estimate.markupRate);
              const files = parseAttachmentsJson(estimate.attachments);
              return (
                <tr key={estimate.id} className="border-b border-border/70">
                  <td className="px-4 py-3">
                    <Link href={estimateDetailPath(estimate.id)} className="font-medium">
                      {estimate.title}
                    </Link>
                    {files.length ? (
                      <p className="text-xs text-muted-foreground">
                        {formatMessage(copy.attached, { count: files.length })}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{estimate.clientName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={estimate.status} labels={dict.app.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {estimate.viewedAt ? format(estimate.viewedAt, "MMM d") : "—"}
                  </td>
                  <td className="px-4 py-3">{formatCents(totals.totalCents, estimate.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {estimates.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground">{copy.empty}</p>
        ) : null}
      </div>
    </div>
  );
}
