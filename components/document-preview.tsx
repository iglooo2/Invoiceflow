import { format } from "date-fns";
import { parseAttachmentsJson, type EstimateAttachment } from "@/lib/estimates";
import { estimateTotals, formatCents, invoiceTotals } from "@/lib/money";
import { studioName } from "@/lib/session";

type Studio = {
  businessName?: string | null;
  name?: string | null;
  businessEmail?: string | null;
  email?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  website?: string | null;
};

export function InvoicePreview({
  studio,
  invoice,
  branded,
}: {
  studio: Studio;
  branded?: boolean;
  invoice: {
    number: string;
    status: string;
    issueDate: Date;
    dueDate: Date | null;
    taxRate: number;
    notes: string | null;
    currency: string;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    clientAddress: string | null;
    items: { description: string; quantity: number; rate: number }[];
  };
}) {
  const totals = invoiceTotals(invoice.items, invoice.taxRate);
  return (
    <article className="paper-card mx-auto w-full max-w-3xl rounded-3xl p-8 md:p-12">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{studioName(studio)}</p>
          <h1 className="font-display text-4xl">Invoice</h1>
        </div>
        <div className="text-sm sm:text-right">
          <p className="font-medium">{invoice.number}</p>
          <p className="capitalize text-muted-foreground">{invoice.status}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">From</p>
          <p className="mt-1 font-medium">{studioName(studio)}</p>
          <p>{studio.businessEmail || studio.email}</p>
          <p>{studio.businessPhone}</p>
          <p className="whitespace-pre-line">{studio.businessAddress}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Bill to</p>
          <p className="mt-1 font-medium">{invoice.clientName}</p>
          <p>{invoice.clientCompany}</p>
          <p>{invoice.clientEmail}</p>
          <p className="whitespace-pre-line">{invoice.clientAddress}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Issued {format(invoice.issueDate, "MMM d, yyyy")}
        {invoice.dueDate ? ` · Due ${format(invoice.dueDate, "MMM d, yyyy")}` : ""}
      </p>
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 font-medium">Qty</th>
            <th className="py-2 font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index} className="border-b border-border/70">
              <td className="py-3">{item.description}</td>
              <td>{item.quantity}</td>
              <td>{formatCents(Math.round(item.rate * 100), invoice.currency)}</td>
              <td className="text-right">
                {formatCents(Math.round(item.quantity * item.rate * 100), invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 ml-auto grid w-full max-w-xs gap-1 text-sm">
        <Row label="Subtotal" value={formatCents(totals.subtotalCents, invoice.currency)} />
        <Row label={`Tax (${invoice.taxRate}%)`} value={formatCents(totals.taxCents, invoice.currency)} />
        <Row label="Total due" value={formatCents(totals.totalCents, invoice.currency)} strong />
      </div>
      {invoice.notes ? (
        <p className="mt-8 whitespace-pre-line text-sm text-muted-foreground">{invoice.notes}</p>
      ) : null}
      {branded ? (
        <p className="mt-10 text-xs text-muted-foreground">Made with InvoiceFlow</p>
      ) : null}
    </article>
  );
}

export function ProposalPreview({
  studio,
  proposal,
  branded,
}: {
  studio: Studio;
  branded?: boolean;
  proposal: {
    title: string;
    status: string;
    validUntil: Date | null;
    notes: string | null;
    currency: string;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    taxRate?: number;
    markupRate?: number;
    signedName?: string | null;
    signedAt?: Date | null;
    attachments?: EstimateAttachment[] | string | null;
    sections: { heading: string; body: string; amount: number | null }[];
  };
}) {
  const totals = estimateTotals(proposal.sections, proposal.taxRate ?? 0, proposal.markupRate ?? 0);
  const attachments = Array.isArray(proposal.attachments)
    ? proposal.attachments
    : parseAttachmentsJson(proposal.attachments);
  return (
    <article className="paper-card mx-auto w-full max-w-3xl rounded-3xl p-8 md:p-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{studioName(studio)}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-primary">Estimate</p>
      <h1 className="mt-2 font-display text-4xl">{proposal.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Prepared for {proposal.clientName}
        {proposal.clientCompany ? ` · ${proposal.clientCompany}` : ""}
        {proposal.validUntil ? ` · Valid through ${format(proposal.validUntil, "MMM d, yyyy")}` : ""}
      </p>
      <div className="mt-8 grid gap-8">
        {proposal.sections.map((section, index) => (
          <section key={index}>
            <h2 className="font-display text-2xl text-primary">{section.heading}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6">{section.body}</p>
            {section.amount != null ? (
              <p className="mt-2 text-sm font-medium">
                {formatCents(Math.round(section.amount * 100), proposal.currency)}
              </p>
            ) : null}
          </section>
        ))}
      </div>
      <div className="mt-8 ml-auto grid w-full max-w-xs gap-1 text-sm">
        <Row label="Subtotal" value={formatCents(totals.subtotalCents, proposal.currency)} />
        {totals.markupCents > 0 ? (
          <Row
            label={`Markup (${proposal.markupRate ?? 0}%)`}
            value={formatCents(totals.markupCents, proposal.currency)}
          />
        ) : null}
        {totals.taxCents > 0 ? (
          <Row label={`Tax (${proposal.taxRate ?? 0}%)`} value={formatCents(totals.taxCents, proposal.currency)} />
        ) : null}
        <Row label="Investment" value={formatCents(totals.totalCents, proposal.currency)} strong />
      </div>
      {attachments.length ? (
        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Photos & files</p>
          <ul className="mt-2 grid gap-1 text-sm">
            {attachments.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {proposal.signedName ? (
        <p className="mt-6 text-sm">
          Approved online by <span className="font-medium">{proposal.signedName}</span>
          {proposal.signedAt ? ` · ${format(proposal.signedAt, "MMM d, yyyy")}` : ""}
        </p>
      ) : null}
      {proposal.notes ? <p className="mt-4 text-sm text-muted-foreground">{proposal.notes}</p> : null}
      {branded ? <p className="mt-10 text-xs text-muted-foreground">Made with InvoiceFlow</p> : null}
    </article>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
