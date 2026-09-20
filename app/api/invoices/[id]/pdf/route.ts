import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildInvoicePdf, pdfDownloadHeaders } from "@/lib/pdf";
import { currentPlanId } from "@/lib/plans";
import { STUDIO_USER_SELECT, withDocumentFooter } from "@/lib/studio-settings-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
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
  const isOwner = session?.user?.id === invoice.userId;
  if (!isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
