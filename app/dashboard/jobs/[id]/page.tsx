import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { appCopy } from "@/lib/i18n-request";
import { dateInputValue } from "@/lib/jobs";
import { findJobForUser } from "@/lib/job-queries";
import { requireUser } from "@/lib/session";
import { deleteJob, updateJob } from "@/app/actions/jobs";
import { JobForm } from "@/components/jobs/job-form";
import { Button } from "@/components/ui/button";
import { listEstimatesForUser } from "@/lib/proposal-queries";

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const { id } = await params;
  const { error } = await searchParams;
  const [loaded, clients, invoices, estimateLoad] = await Promise.all([
    findJobForUser(prisma, { userId: user.id, jobId: id }),
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

  if (loaded.warning && !loaded.job) {
    return <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{loaded.warning}</p>;
  }
  if (loaded.error) {
    return <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{loaded.error}</p>;
  }
  if (!loaded.job) notFound();
  const job = loaded.job;

  return (
    <div className="grid gap-6">
      <JobForm
        action={updateJob}
        jobId={job.id}
        formError={error}
        copy={dict.app.jobForm}
        clients={clients}
        estimates={estimateLoad.estimates.map((estimate) => ({
          id: estimate.id,
          title: estimate.title,
          clientName: estimate.clientName,
        }))}
        invoices={invoices}
        initial={{
          title: job.title,
          clientId: job.clientId,
          address: job.address,
          startDate: job.startDate,
          endDate: job.endDate,
          notes: job.notes,
          status: job.status,
          estimateIds: job.estimates.map((item) => item.estimateId),
          invoiceIds: job.invoices.map((item) => item.invoiceId),
          visits: job.visits.map((visit) => ({
            notes: visit.notes,
            scheduledAt: dateInputValue(visit.scheduledAt),
          })),
          jobNumber: job.jobNumber,
        }}
      />
      <form action={deleteJob} className="flex justify-end">
        <input type="hidden" name="jobId" value={job.id} />
        <Button type="submit" variant="ghost">
          {dict.app.jobForm.deleteJob}
        </Button>
      </form>
    </div>
  );
}
