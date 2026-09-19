import { redirect } from "next/navigation";
import { ESTIMATE_LIST_PATH } from "@/lib/estimates";

export default async function ProposalsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  redirect(query ? `${ESTIMATE_LIST_PATH}?${query}` : ESTIMATE_LIST_PATH);
}
