import { format } from "date-fns";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ProposalForm } from "@/components/proposal-form";
import { updateProposal } from "@/app/actions/proposals";
import { appCopy } from "@/lib/i18n-request";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { id } = await params;
  const [proposal, clients] = await Promise.all([
    prisma.proposal.findFirst({
      where: { id, userId: user.id },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!proposal) notFound();

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-4xl">{dict.app.edit}</h1>
      <ProposalForm
        action={updateProposal.bind(null, proposal.id)}
        clients={clients}
        initial={{
          clientId: proposal.clientId,
          title: proposal.title,
          clientName: proposal.clientName,
          clientEmail: proposal.clientEmail,
          clientCompany: proposal.clientCompany,
          validUntil: proposal.validUntil ? format(proposal.validUntil, "yyyy-MM-dd") : "",
          notes: proposal.notes,
          status: proposal.status,
          sections: proposal.sections,
        }}
      />
    </div>
  );
}
