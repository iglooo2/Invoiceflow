import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ProposalForm } from "@/components/proposal-form";
import { createProposal } from "@/app/actions/proposals";
import { appCopy } from "@/lib/i18n-request";

export default async function NewProposalPage({
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
        <h1 className="font-display text-4xl">{dict.app.newProposal}</h1>
        <p className="text-muted-foreground">{dict.app.newProposalLede}</p>
      </div>
      <ProposalForm
        action={createProposal}
        formError={error}
        clients={clients}
        initial={{
          title: "",
          clientName: "",
          status: "draft",
          sections: [{ heading: "Scope", body: "", amount: null }],
        }}
      />
    </div>
  );
}
