import Link from "next/link";
import { prisma } from "@/lib/db";
import { appCopy } from "@/lib/i18n-request";
import { formatJobDateRange, JOB_NEW_PATH, JOB_SCHEMA_WARNING, jobDetailPath, parseJobStatus } from "@/lib/jobs";
import { countJobsForUser, listJobsForUser } from "@/lib/job-queries";
import { DASHBOARD_LIST_TAKE } from "@/lib/query-limits";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { JobEmptyIllustration } from "@/components/jobs/job-empty-illustration";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = parseJobStatus(params.status);
  const copy = dict.app.jobList;
  const [loaded, counted] = await Promise.all([
    listJobsForUser(prisma, { userId: user.id, status, q, take: DASHBOARD_LIST_TAKE }),
    countJobsForUser(prisma, user.id),
  ]);
  const showIllustratedEmpty =
    !loaded.error && !loaded.usedLegacySchema && counted.count === 0 && !q;

  return (
    <div className="grid gap-6">
      <h1 className="font-display text-4xl">{dict.app.jobs}</h1>

      {loaded.error ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{loaded.error}</p> : null}
      {loaded.usedLegacySchema || loaded.warning ? (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{loaded.warning || JOB_SCHEMA_WARNING}</p>
      ) : null}

      <form method="get" className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm">
        {status !== "active" ? <input type="hidden" name="status" value={status} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder={copy.search}
          aria-label={copy.search}
          className="h-10 min-w-0 flex-1 border-0 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button asChild>
          <Link href={JOB_NEW_PATH}>{dict.app.newJob}</Link>
        </Button>
      </form>

      <div className="flex gap-6 border-b border-border text-sm font-medium tracking-wide">
        <TabLink href={jobsHref("active", q)} active={status === "active"} label={copy.active} />
        <TabLink href={jobsHref("complete", q)} active={status === "complete"} label={copy.complete} />
      </div>

      {showIllustratedEmpty ? (
        <div className="grid min-h-[22rem] place-content-center justify-items-center gap-4 px-4 py-10 text-center">
          <JobEmptyIllustration />
          <div className="grid max-w-md gap-2">
            <h2 className="font-display text-2xl">{copy.emptyTitle}</h2>
            <p className="text-sm text-muted-foreground">{copy.emptyBody}</p>
          </div>
          <Button asChild>
            <Link href={JOB_NEW_PATH}>{dict.app.createNewJob}</Link>
          </Button>
        </div>
      ) : loaded.jobs.length === 0 && !loaded.error ? (
        <p className="rounded-3xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {copy.emptyFiltered}
        </p>
      ) : (
        <div className="grid gap-3">
          {loaded.jobs.map((job) => {
            const dates = formatJobDateRange(job.startDate, job.endDate);
            const place = job.address || job.clientAddress;
            return (
              <Link
                key={job.id}
                href={jobDetailPath(job.id)}
                className="rounded-3xl border border-border bg-card px-5 py-4 hover:border-primary"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{job.jobNumber}</p>
                <p className="font-display text-xl">{job.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[job.clientName || copy.noClient, place, dates].filter(Boolean).join(" · ")}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function jobsHref(status: "active" | "complete", q: string) {
  const params = new URLSearchParams();
  if (status !== "active") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/dashboard/jobs?${query}` : "/dashboard/jobs";
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "-mb-px border-b-2 border-primary px-1 pb-3 font-semibold uppercase text-primary"
          : "-mb-px border-b-2 border-transparent px-1 pb-3 uppercase text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
