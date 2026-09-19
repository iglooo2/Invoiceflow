import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { prismaReadFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { buildProposalPdf, pdfDownloadHeaders } from "@/lib/pdf";
import { currentPlanId } from "@/lib/plans";
import { findEstimateByPublicToken } from "@/lib/proposal-queries";
import { withDocumentFooter } from "@/lib/studio-settings-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const loaded = await findEstimateByPublicToken(prisma, token, {
      includeSections: true,
      includeUser: true,
    });
    if (loaded.error) {
      return NextResponse.json({ error: loaded.error }, { status: 503 });
    }
    const proposal = loaded.estimate;
    if (!proposal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const studio = (proposal.user ?? {}) as {
      businessName?: string | null;
      name?: string | null;
      plan?: string | null;
      stripeCurrentPeriodEnd?: Date | null;
    };
    const bytes = await buildProposalPdf({
      studio: await withDocumentFooter(proposal.userId, studio),
      proposal,
      branded: currentPlanId(studio) !== "pro",
    });
    return new NextResponse(bytes, {
      headers: pdfDownloadHeaders(proposal.title),
    });
  } catch (error) {
    console.error("share proposal pdf", safeErrorLog(error));
    return NextResponse.json({ error: prismaReadFailureMessage(error) }, { status: 500 });
  }
}
