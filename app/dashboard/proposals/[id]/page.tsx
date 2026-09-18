import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { publicProposalUrl } from "@/lib/email";
import { currentPlanId } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ProposalPreview } from "@/components/document-preview";
import { deleteProposal, emailProposal } from "@/app/actions/proposals";

export default async function ProposalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const proposal = await prisma.proposal.findFirst({
    where: { id, userId: user.id },
    include: { sections: { orderBy: { sortOrder: "asc" } } },
  });
  if (!proposal) notFound();
  const share = publicProposalUrl(proposal.publicToken);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="font-display text-4xl">{proposal.title}</h1>
          <p className="text-muted-foreground">{proposal.clientName}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <CopyLinkButton value={share} />
          <Button asChild variant="outline">
            <a href={`/api/proposals/${proposal.id}/pdf`}>Download PDF</a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/share/p/${proposal.publicToken}`}>Public view</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/proposals/${proposal.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>
      {error ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p> : null}
      <div className="no-print flex flex-wrap gap-2">
        <form action={emailProposal}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <Button type="submit" variant="secondary">
            Email share link
          </Button>
        </form>
        <form action={deleteProposal}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <Button type="submit" variant="ghost">
            Delete
          </Button>
        </form>
      </div>
      <ProposalPreview studio={user} proposal={proposal} branded={currentPlanId(user) !== "pro"} />
    </div>
  );
}
