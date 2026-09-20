import { prisma } from "@/lib/db";
import { appCopy } from "@/lib/i18n-request";
import { CLIENT_PICKER_SELECT } from "@/lib/job-queries";
import { DOCUMENT_PICKER_TAKE } from "@/lib/query-limits";
import { requireUser } from "@/lib/session";
import { ProposalForm } from "@/components/proposal-form";
import { createProposal } from "@/app/actions/proposals";
import { defaultContractDetails, defaultTaxPercent, loadStudioSettings } from "@/lib/studio-settings-store";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { error } = await searchParams;
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    select: CLIENT_PICKER_SELECT,
    orderBy: { name: "asc" },
    take: DOCUMENT_PICKER_TAKE,
  });
  const [{ settings }, taxRate, contractNotes] = await Promise.all([
    loadStudioSettings(user.id),
    defaultTaxPercent(user.id),
    defaultContractDetails(user.id, "estimate"),
  ]);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">{dict.app.newEstimate}</h1>
        <p className="text-muted-foreground">{dict.app.newEstimateLede}</p>
      </div>
      <ProposalForm
        action={createProposal}
        formError={error}
        clients={clients}
        initial={{
          title: "",
          clientName: "",
          status: "draft",
          taxRate,
          markupRate: settings.defaultMarkupPercent,
          notes: contractNotes,
          attachments: [],
          sections: [{ heading: "Work", body: "", amount: null }],
        }}
      />
    </div>
  );
}
