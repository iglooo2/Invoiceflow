import { prisma } from "@/lib/db";
import { appCopy } from "@/lib/i18n-request";
import { requireUser } from "@/lib/session";
import { createJob } from "@/app/actions/jobs";
import { JobForm } from "@/components/jobs/job-form";
import { JOB_CLIENT_PICKER_SELECT, JOB_INVOICE_PICKER_SELECT } from "@/lib/job-queries";
import { DOCUMENT_PICKER_TAKE } from "@/lib/query-limits";
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
      select: JOB_CLIENT_PICKER_SELECT,
      orderBy: { name: "asc" },
      take: DOCUMENT_PICKER_TAKE,
    }),
    prisma.invoice.findMany({
      where: { userId: user.id },
      select: JOB_INVOICE_PICKER_SELECT,
      orderBy: { createdAt: "desc" },
      take: DOCUMENT_PICKER_TAKE,
    }),
    listEstimatesForUser(prisma, {
      userId: user.id,
      includeSections: false,
      take: DOCUMENT_PICKER_TAKE,
    }),
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
