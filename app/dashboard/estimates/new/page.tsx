import { prisma } from "@/lib/db";
import { appCopy } from "@/lib/i18n-request";
import { requireUser } from "@/lib/session";
import { ProposalForm } from "@/components/proposal-form";
import { createProposal } from "@/app/actions/proposals";

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
    orderBy: { name: "asc" },
  });
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
          taxRate: 0,
          markupRate: 0,
          attachments: [],
          sections: [{ heading: "Work", body: "", amount: null }],
        }}
      />
    </div>
  );
}
