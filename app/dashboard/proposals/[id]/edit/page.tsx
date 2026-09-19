import { redirect } from "next/navigation";
import { estimateEditPath } from "@/lib/estimates";

export default async function ProposalEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(estimateEditPath(id));
}
