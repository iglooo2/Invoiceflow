import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  csvDownloadHeaders,
  estimatesExportFilename,
  estimatesToCsv,
  parseListFilters,
} from "@/lib/csv";
import { prisma } from "@/lib/db";
import { prismaReadFailureMessage, safeErrorLog } from "@/lib/db-errors";
import { listEstimatesForUser } from "@/lib/proposal-queries";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const filters = parseListFilters(new URL(request.url).searchParams);
    const loaded = await listEstimatesForUser(prisma, {
      userId: session.user.id,
      status: filters.status,
      q: filters.q,
      includeSections: true,
    });
    if (loaded.error) {
      return NextResponse.json({ error: loaded.error }, { status: 503 });
    }
    const filename = estimatesExportFilename();
    return new NextResponse(estimatesToCsv(loaded.estimates), {
      headers: csvDownloadHeaders(filename),
    });
  } catch (error) {
    console.error("estimate csv", safeErrorLog(error));
    return NextResponse.json({ error: prismaReadFailureMessage(error) }, { status: 500 });
  }
}
