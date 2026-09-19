import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { prismaReadFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { publicProposalUrl } from "@/lib/email";
import { estimateEditPath, formatEstimateDate } from "@/lib/estimates";
import { ESTIMATE_SCHEMA_WARNING, findEstimateForUser } from "@/lib/proposal-queries";
import { appCopy } from "@/lib/i18n-request";
import { formatMessage } from "@/lib/i18n";
import { currentPlanId } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ProposalPreview } from "@/components/document-preview";
import { StatusBadge } from "@/components/status-badge";
import { deleteProposal, emailProposal, markProposalStatus } from "@/app/actions/proposals";
import { withDocumentFooter } from "@/lib/studio-settings-store";

export default async function EstimateDetailPage({
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
  let loaded;
  try {
    loaded = await findEstimateForUser(prisma, user.id, id, { includeSections: true });
  } catch (caught) {
    console.error("EstimateDetailPage", safeErrorLog(caught));
    loaded = {
      estimate: null,
      usedLegacySchema: false,
      error: prismaReadFailureMessage(caught),
    };
  }
  if (loaded.error) {
    return (
      <div className="grid gap-6">
        <h1 className="font-display text-4xl">{dict.app.estimates}</h1>
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{loaded.error}</p>
      </div>
    );
  }
  const estimate = loaded.estimate;
  if (!estimate) notFound();
  const share = publicProposalUrl(estimate.publicToken);
  const activity = dict.app.estimateActivity;
  const openedWhen = formatEstimateDate(estimate.viewedAt, "MMM d, yyyy 'at' h:mm a");
  const signedWhen = formatEstimateDate(estimate.signedAt, "MMM d");

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl">{estimate.title}</h1>
            <StatusBadge status={estimate.status} labels={dict.app.status} />
          </div>
          <p className="text-muted-foreground">{estimate.clientName}</p>
        </div>
        <div className="btn-row no-print">
          <CopyLinkButton value={share} label={dict.app.copyLink} copiedLabel={dict.app.copied} />
          <Button asChild variant="outline">
            <a href={`/api/proposals/${estimate.id}/pdf`}>{dict.app.downloadPdf}</a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/share/p/${estimate.publicToken}`}>{dict.app.publicView}</Link>
          </Button>
          <Button asChild>
            <Link href={estimateEditPath(estimate.id)}>{dict.app.edit}</Link>
          </Button>
        </div>
      </div>
      {error ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p> : null}
      {loaded.usedLegacySchema ? (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{ESTIMATE_SCHEMA_WARNING}</p>
      ) : null}
      <div className="no-print rounded-3xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        {openedWhen
          ? formatMessage(activity.opened, { when: openedWhen })
          : activity.notOpened}{" "}
        {estimate.signedName
          ? formatMessage(activity.approved, {
              name: estimate.signedName,
              when: signedWhen ? ` · ${signedWhen}` : "",
            })
          : activity.waiting}{" "}
        {activity.email}
      </div>
      <div className="btn-row no-print">
        <form action={emailProposal}>
          <input type="hidden" name="proposalId" value={estimate.id} />
          <Button type="submit" variant="secondary">
            {dict.app.emailShareLink}
          </Button>
        </form>
        {estimate.status !== "pending" ? (
          <form action={markProposalStatus}>
            <input type="hidden" name="proposalId" value={estimate.id} />
            <input type="hidden" name="status" value="pending" />
            <Button type="submit" variant="outline">
              {dict.app.markPending}
            </Button>
          </form>
        ) : null}
        <form action={deleteProposal}>
          <input type="hidden" name="proposalId" value={estimate.id} />
          <Button type="submit" variant="ghost">
            {dict.app.delete}
          </Button>
        </form>
      </div>
      <ProposalPreview
        studio={await withDocumentFooter(user.id, user)}
        proposal={estimate}
        branded={currentPlanId(user) !== "pro"}
      />
    </div>
  );
}
