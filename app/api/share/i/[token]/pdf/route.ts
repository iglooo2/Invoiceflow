import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildInvoicePdf, pdfDownloadHeaders } from "@/lib/pdf";
import { currentPlanId } from "@/lib/plans";
import { withDocumentFooter } from "@/lib/studio-settings-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { items: { orderBy: { sortOrder: "asc" } }, user: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const bytes = await buildInvoicePdf({
    studio: await withDocumentFooter(invoice.userId, invoice.user),
    invoice,
    branded: currentPlanId(invoice.user) !== "pro",
  });
  return new NextResponse(bytes, {
    headers: pdfDownloadHeaders(`${invoice.number}.pdf`),
  });
}
