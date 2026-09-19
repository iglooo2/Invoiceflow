import { redirect } from "next/navigation";
import { estimateDetailPath } from "@/lib/estimates";

export default async function ProposalDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(estimateDetailPath(id));
}
