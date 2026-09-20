import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildInvoicePdf, pdfDownloadHeaders } from "@/lib/pdf";
import { currentPlanId } from "@/lib/plans";
import { STUDIO_USER_SELECT, withDocumentFooter } from "@/lib/studio-settings-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    select: {
      userId: true,
      number: true,
      status: true,
      issueDate: true,
      dueDate: true,
      taxRate: true,
      notes: true,
      currency: true,
      clientName: true,
      clientEmail: true,
      clientCompany: true,
      clientAddress: true,
      items: {
        orderBy: { sortOrder: "asc" },
        take: 80,
        select: { description: true, quantity: true, rate: true },
      },
      user: { select: STUDIO_USER_SELECT },
    },
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
