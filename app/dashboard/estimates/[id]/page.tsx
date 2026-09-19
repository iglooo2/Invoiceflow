import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { publicProposalUrl } from "@/lib/email";
import { estimateEditPath } from "@/lib/estimates";
import { currentPlanId } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ProposalPreview } from "@/components/document-preview";
import { deleteProposal, emailProposal } from "@/app/actions/proposals";

export default async function EstimateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const estimate = await prisma.proposal.findFirst({
    where: { id, userId: user.id },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!estimate) notFound();
  const share = publicProposalUrl(estimate.publicToken);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="font-display text-4xl">{estimate.title}</h1>
          <p className="text-muted-foreground">{estimate.clientName}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <CopyLinkButton value={share} />
          <Button asChild variant="outline">
            <a href={`/api/proposals/${estimate.id}/pdf`}>Download PDF</a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/share/p/${estimate.publicToken}`}>Public view</Link>
          </Button>
          <Button asChild>
            <Link href={estimateEditPath(estimate.id)}>Edit</Link>
          </Button>
        </div>
      </div>
      {error ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p> : null}
      <div className="no-print rounded-3xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        {estimate.viewedAt
          ? `Opened ${format(estimate.viewedAt, "MMM d, yyyy 'at' h:mm a")}.`
          : "Not opened yet."}{" "}
        {estimate.signedName
          ? `Approved online by ${estimate.signedName}${estimate.signedAt ? ` on ${format(estimate.signedAt, "MMM d")}` : ""}.`
          : "Waiting for an online approval."}{" "}
        We email your studio address when a client opens or approves — if Resend is not configured, the status
        still updates here.
      </div>
      <div className="no-print flex flex-wrap gap-2">
        <form action={emailProposal}>
          <input type="hidden" name="proposalId" value={estimate.id} />
          <Button type="submit" variant="secondary">
            Email share link
          </Button>
        </form>
        <form action={deleteProposal}>
          <input type="hidden" name="proposalId" value={estimate.id} />
          <Button type="submit" variant="ghost">
            Delete
          </Button>
        </form>
      </div>
      <ProposalPreview studio={user} proposal={estimate} branded={currentPlanId(user) !== "pro"} />
    </div>
  );
}
