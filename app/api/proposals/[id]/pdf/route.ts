import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildProposalPdf, pdfDownloadHeaders } from "@/lib/pdf";
import { currentPlanId } from "@/lib/plans";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await context.params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { sections: { orderBy: { sortOrder: "asc" } }, user: true },
  });
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session?.user?.id !== proposal.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bytes = await buildProposalPdf({
    studio: proposal.user,
    proposal,
    branded: currentPlanId(proposal.user) !== "pro",
  });
  return new NextResponse(bytes, {
    headers: pdfDownloadHeaders(`${proposal.title.replace(/\s+/g, "-").toLowerCase()}.pdf`),
  });
}
