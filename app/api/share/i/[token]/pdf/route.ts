import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildInvoicePdf } from "@/lib/pdf";
import { currentPlanId } from "@/lib/plans";

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
    studio: invoice.user,
    invoice,
    branded: currentPlanId(invoice.user) !== "pro",
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
