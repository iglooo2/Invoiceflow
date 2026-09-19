import { format } from "date-fns";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseAttachmentsJson } from "@/lib/estimates";
import { requireUser } from "@/lib/session";
import { ProposalForm } from "@/components/proposal-form";
import { updateProposal } from "@/app/actions/proposals";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [estimate, clients] = await Promise.all([
    prisma.proposal.findFirst({
      where: { id, userId: user.id },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);
  if (!estimate) notFound();

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-4xl">Edit estimate</h1>
      <ProposalForm
        action={updateProposal.bind(null, estimate.id)}
        clients={clients}
        initial={{
          clientId: estimate.clientId,
          title: estimate.title,
          clientName: estimate.clientName,
          clientEmail: estimate.clientEmail,
          clientCompany: estimate.clientCompany,
          validUntil: estimate.validUntil ? format(estimate.validUntil, "yyyy-MM-dd") : "",
          notes: estimate.notes,
          status: estimate.status,
          taxRate: estimate.taxRate,
          markupRate: estimate.markupRate,
          attachments: parseAttachmentsJson(estimate.attachments),
          sections: estimate.sections,
        }}
      />
    </div>
  );
}
