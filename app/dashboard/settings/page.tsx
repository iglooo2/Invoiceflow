import { redirect } from "next/navigation";

export default async function SettingsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ qb?: string }>;
}) {
  const { qb } = await searchParams;
  if (qb) redirect(`/dashboard/settings/quickbooks?qb=${encodeURIComponent(qb)}`);
  redirect("/dashboard/settings/account");
}
