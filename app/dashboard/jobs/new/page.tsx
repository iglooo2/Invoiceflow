import { prisma } from "@/lib/db";
import { appCopy } from "@/lib/i18n-request";
import { requireUser } from "@/lib/session";
import { createJob } from "@/app/actions/jobs";
import { JobForm } from "@/components/jobs/job-form";
import { listEstimatesForUser } from "@/lib/proposal-queries";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { error } = await searchParams;
  const [clients, invoices, estimateLoad] = await Promise.all([
    prisma.client.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      where: { userId: user.id },
      select: { id: true, number: true, clientName: true },
      orderBy: { createdAt: "desc" },
    }),
    listEstimatesForUser(prisma, { userId: user.id, includeSections: false }),
  ]);

  return (
    <JobForm
      action={createJob}
      formError={error}
      copy={dict.app.jobForm}
      clients={clients}
      estimates={estimateLoad.estimates.map((estimate) => ({
        id: estimate.id,
        title: estimate.title,
        clientName: estimate.clientName,
      }))}
      invoices={invoices}
    />
  );
}
