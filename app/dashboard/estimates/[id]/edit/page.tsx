import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { prismaReadFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { formatEstimateDate, parseAttachmentsJson } from "@/lib/estimates";
import { CLIENT_PICKER_SELECT } from "@/lib/job-queries";
import { DOCUMENT_PICKER_TAKE } from "@/lib/query-limits";
import { ESTIMATE_SCHEMA_WARNING, findEstimateForUser } from "@/lib/proposal-queries";
import { appCopy } from "@/lib/i18n-request";
import { requireUser } from "@/lib/session";
import { ProposalForm } from "@/components/proposal-form";
import { updateProposal } from "@/app/actions/proposals";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { id } = await params;
  let loaded;
  try {
    loaded = await findEstimateForUser(prisma, user.id, id, { includeSections: true });
  } catch (error) {
    console.error("EditEstimatePage", safeErrorLog(error));
    loaded = {
      estimate: null,
      usedLegacySchema: false,
      error: prismaReadFailureMessage(error),
    };
  }
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: CLIENT_PICKER_SELECT,
    orderBy: { name: "asc" },
    take: DOCUMENT_PICKER_TAKE,
  });
  if (loaded.error) {
    return (
      <div className="grid gap-6">
        <h1 className="font-display text-4xl">{dict.app.editEstimate}</h1>
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{loaded.error}</p>
      </div>
    );
  }
  const estimate = loaded.estimate;
  if (!estimate) notFound();

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-4xl">{dict.app.editEstimate}</h1>
      {loaded.usedLegacySchema ? (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{ESTIMATE_SCHEMA_WARNING}</p>
      ) : null}
      <ProposalForm
        action={updateProposal.bind(null, estimate.id)}
        clients={clients}
        initial={{
          clientId: estimate.clientId,
          title: estimate.title,
          clientName: estimate.clientName,
          clientEmail: estimate.clientEmail,
          clientCompany: estimate.clientCompany,
          validUntil: formatEstimateDate(estimate.validUntil, "yyyy-MM-dd"),
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
