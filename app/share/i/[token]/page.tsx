import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentPlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { InvoicePreview } from "@/components/document-preview";
import { Wordmark } from "@/components/brand";
import { withDocumentFooter } from "@/lib/studio-settings-store";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: { items: { orderBy: { sortOrder: "asc" } }, user: true },
  });
  if (!invoice) notFound();
  const branded = currentPlanId(invoice.user) !== "pro";

  return (
    <div className="px-4 py-10">
      <div className="no-print mx-auto mb-6 flex w-full max-w-3xl flex-wrap items-center justify-between gap-2">
        {branded ? <Wordmark /> : <span className="font-display text-xl">{invoice.user.businessName || invoice.user.name}</span>}
        <Button asChild variant="outline">
          <a href={`/api/share/i/${token}/pdf`}>Download PDF</a>
        </Button>
      </div>
      <InvoicePreview
        studio={await withDocumentFooter(invoice.userId, invoice.user)}
        invoice={invoice}
        branded={branded}
      />
    </div>
  );
}
