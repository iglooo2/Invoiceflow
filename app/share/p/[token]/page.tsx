import { notFound } from "next/navigation";
import { markEstimateOpened } from "@/app/actions/proposals";
import { prisma } from "@/lib/db";
import { prismaReadFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { currentPlanId } from "@/lib/plans";
import { findEstimateByPublicToken } from "@/lib/proposal-queries";
import { Button } from "@/components/ui/button";
import { ProposalPreview } from "@/components/document-preview";
import { Wordmark } from "@/components/brand";
import { ProposalResponse } from "./respond-buttons";
import { withDocumentFooter } from "@/lib/studio-settings-store";

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  let loaded;
  try {
    loaded = await findEstimateByPublicToken(prisma, token, {
      includeSections: true,
      includeUser: true,
    });
  } catch (caught) {
    console.error("PublicProposalPage", safeErrorLog(caught));
    loaded = {
      estimate: null,
      usedLegacySchema: false,
      error: prismaReadFailureMessage(caught),
    };
  }
  if (loaded.error) {
    return (
      <div className="px-4 py-10">
        <p className="mx-auto w-full max-w-3xl rounded-2xl bg-primary/10 px-4 py-3 text-sm">{loaded.error}</p>
      </div>
    );
  }
  const proposal = loaded.estimate;
  if (!proposal) notFound();
  await markEstimateOpened(token);
  const studio = (proposal.user ?? {}) as {
    businessName?: string | null;
    name?: string | null;
    businessEmail?: string | null;
    email?: string | null;
    businessPhone?: string | null;
    businessAddress?: string | null;
    website?: string | null;
    plan?: string | null;
    stripeCurrentPeriodEnd?: Date | null;
  };
  const branded = currentPlanId(studio) !== "pro";

  return (
    <div className="px-4 py-10">
      {error ? (
        <p className="mx-auto mb-4 w-full max-w-3xl rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p>
      ) : null}
      <div className="no-print mx-auto mb-6 flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {branded ? <Wordmark /> : <span className="font-display text-xl">{studio.businessName || studio.name}</span>}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/api/share/p/${token}/pdf`}>Download PDF</a>
          </Button>
          <ProposalResponse token={token} status={proposal.status} />
        </div>
      </div>
      <ProposalPreview
        studio={await withDocumentFooter(proposal.userId, studio)}
        proposal={proposal}
        branded={branded}
      />
    </div>
  );
}
