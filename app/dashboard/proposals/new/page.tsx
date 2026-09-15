import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ProposalForm } from "@/components/proposal-form";
import { createProposal } from "@/app/actions/proposals";

export default async function NewProposalPage() {
  const user = await requireUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-4xl">New proposal</h1>
        <p className="text-muted-foreground">Sections, optional prices, accept/decline on the public link.</p>
      </div>
      <ProposalForm
        action={createProposal}
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
