import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  csvDownloadHeaders,
  invoiceListWhere,
  invoicesExportFilename,
  invoicesToCsv,
  parseListFilters,
} from "@/lib/csv";
import { prisma } from "@/lib/db";
import { prismaReadFailureMessage, safeErrorLog } from "@/lib/db-errors";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const filters = parseListFilters(new URL(request.url).searchParams);
    const invoices = await prisma.invoice.findMany({
      where: invoiceListWhere(session.user.id, filters),
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    const filename = invoicesExportFilename();
    return new NextResponse(invoicesToCsv(invoices), {
      headers: csvDownloadHeaders(filename),
    });
  } catch (error) {
    console.error("invoice csv", safeErrorLog(error));
    return NextResponse.json({ error: prismaReadFailureMessage(error) }, { status: 500 });
  }
}
