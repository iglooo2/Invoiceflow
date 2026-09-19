import { notFound } from "next/navigation";
import { markEstimateOpened } from "@/app/actions/proposals";
import { prisma } from "@/lib/db";
import { currentPlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { ProposalPreview } from "@/components/document-preview";
import { Wordmark } from "@/components/brand";
import { ProposalResponse } from "./respond-buttons";

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: { sections: { orderBy: { sortOrder: "asc" } }, user: true },
  });
  if (!proposal) notFound();
  await markEstimateOpened(token);
  const branded = currentPlanId(proposal.user) !== "pro";

  return (
    <div className="px-4 py-10">
      {error ? (
        <p className="mx-auto mb-4 w-full max-w-3xl rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p>
      ) : null}
      <div className="no-print mx-auto mb-6 flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {branded ? <Wordmark /> : <span className="font-display text-xl">{proposal.user.businessName || proposal.user.name}</span>}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/api/share/p/${token}/pdf`}>Download PDF</a>
          </Button>
          <ProposalResponse token={token} status={proposal.status} />
        </div>
      </div>
      <ProposalPreview studio={proposal.user} proposal={proposal} branded={branded} />
    </div>
  );
}
