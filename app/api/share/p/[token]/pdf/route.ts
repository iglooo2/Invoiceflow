import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildProposalPdf } from "@/lib/pdf";
import { currentPlanId } from "@/lib/plans";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: { sections: { orderBy: { sortOrder: "asc" } }, user: true },
  });
  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bytes = await buildProposalPdf({
    studio: proposal.user,
    proposal,
    branded: currentPlanId(proposal.user) !== "pro",
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${proposal.title.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
