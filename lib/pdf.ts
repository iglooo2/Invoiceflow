import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { formatCents, invoiceTotals, proposalTotalCents } from "@/lib/money";

const ink = rgb(0.11, 0.1, 0.09);
const muted = rgb(0.42, 0.38, 0.34);
const rust = rgb(0.77, 0.36, 0.15);
const paper = rgb(0.96, 0.93, 0.89);
const rule = rgb(0.85, 0.81, 0.76);

type Studio = {
  businessName?: string | null;
  name?: string | null;
  businessEmail?: string | null;
  email?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  website?: string | null;
};

function studioLabel(studio: Studio) {
  return studio.businessName || studio.name || "Studio";
}

export async function buildInvoicePdf(options: {
  studio: Studio;
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
  branded: boolean;
}) {
  const { invoice, studio, branded } = options;
  const totals = invoiceTotals(invoice.items, invoice.taxRate);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bodyBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: rust });
  page.drawText(studioLabel(studio).toUpperCase(), {
    x: 48,
    y: 762,
    size: 14,
    font: bodyBold,
    color: rgb(1, 0.98, 0.96),
  });
  page.drawText("INVOICE", {
    x: 430,
    y: 762,
    size: 18,
    font: serif,
    color: rgb(1, 0.98, 0.96),
  });

  let y = 700;
  page.drawText(invoice.number, { x: 48, y, size: 12, font: bodyBold, color: ink });
  page.drawText(invoice.status.toUpperCase(), { x: 480, y, size: 10, font: bodyBold, color: rust });
  y -= 22;
  page.drawText(`Issued ${format(invoice.issueDate, "MMM d, yyyy")}`, {
    x: 48,
    y,
    size: 10,
    font: body,
    color: muted,
  });
  if (invoice.dueDate) {
    page.drawText(`Due ${format(invoice.dueDate, "MMM d, yyyy")}`, {
      x: 220,
      y,
      size: 10,
      font: body,
      color: muted,
    });
  }

  y -= 36;
  page.drawText("FROM", { x: 48, y, size: 8, font: bodyBold, color: muted });
  page.drawText("BILL TO", { x: 320, y, size: 8, font: bodyBold, color: muted });
  y -= 16;
  page.drawText(studioLabel(studio), { x: 48, y, size: 11, font: bodyBold, color: ink });
  page.drawText(invoice.clientName, { x: 320, y, size: 11, font: bodyBold, color: ink });
  y -= 14;
  const fromLines = [
    studio.businessEmail || studio.email,
    studio.businessPhone,
    studio.businessAddress,
    studio.website,
  ].filter(Boolean) as string[];
  const toLines = [
    invoice.clientCompany,
    invoice.clientEmail,
    invoice.clientAddress,
  ].filter(Boolean) as string[];
  const lines = Math.max(fromLines.length, toLines.length, 1);
  for (let i = 0; i < lines; i += 1) {
    if (fromLines[i]) page.drawText(fromLines[i], { x: 48, y, size: 9, font: body, color: muted });
    if (toLines[i]) page.drawText(toLines[i], { x: 320, y, size: 9, font: body, color: muted });
    y -= 12;
  }

  y -= 18;
  page.drawRectangle({ x: 48, y: y - 6, width: 516, height: 22, color: paper });
  page.drawText("Description", { x: 56, y, size: 9, font: bodyBold, color: muted });
  page.drawText("Qty", { x: 360, y, size: 9, font: bodyBold, color: muted });
  page.drawText("Rate", { x: 420, y, size: 9, font: bodyBold, color: muted });
  page.drawText("Amount", { x: 500, y, size: 9, font: bodyBold, color: muted });
  y -= 28;

  for (const item of invoice.items) {
    const amount = formatCents(Math.round(item.quantity * item.rate * 100), invoice.currency);
    page.drawText(item.description.slice(0, 48), { x: 56, y, size: 10, font: body, color: ink });
    page.drawText(String(item.quantity), { x: 360, y, size: 10, font: body, color: ink });
    page.drawText(formatCents(Math.round(item.rate * 100), invoice.currency), {
      x: 420,
      y,
      size: 10,
      font: body,
      color: ink,
    });
    page.drawText(amount, { x: 490, y, size: 10, font: body, color: ink });
    y -= 18;
    page.drawLine({
      start: { x: 48, y: y + 10 },
      end: { x: 564, y: y + 10 },
      thickness: 0.5,
      color: rule,
    });
  }

  y -= 8;
  const summary = [
    ["Subtotal", totals.subtotalCents],
    [`Tax (${invoice.taxRate}%)`, totals.taxCents],
    ["Total due", totals.totalCents],
  ] as const;
  for (const [label, cents] of summary) {
    page.drawText(label, { x: 380, y, size: 10, font: label === "Total due" ? bodyBold : body, color: ink });
    page.drawText(formatCents(cents, invoice.currency), {
      x: 490,
      y,
      size: 10,
      font: label === "Total due" ? bodyBold : body,
      color: ink,
    });
    y -= 16;
  }

  if (invoice.notes) {
    y -= 12;
    page.drawText("Notes", { x: 48, y, size: 9, font: bodyBold, color: muted });
    y -= 14;
    page.drawText(invoice.notes.slice(0, 110), { x: 48, y, size: 9, font: body, color: ink });
  }

  if (branded) {
    page.drawText("Made with InvoiceFlow — invoiceflow.dev", {
      x: 48,
      y: 36,
      size: 8,
      font: body,
      color: muted,
    });
  }

  return pdf.save();
}

export async function buildProposalPdf(options: {
  studio: Studio;
  proposal: {
    title: string;
    status: string;
    validUntil: Date | null;
    notes: string | null;
    currency: string;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    sections: { heading: string; body: string; amount: number | null }[];
  };
  branded: boolean;
}) {
  const { proposal, studio, branded } = options;
  const total = proposalTotalCents(proposal.sections);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bodyBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: rgb(0.12, 0.31, 0.27) });
  page.drawText(studioLabel(studio).toUpperCase(), {
    x: 48,
    y: 762,
    size: 14,
    font: bodyBold,
    color: rgb(0.95, 0.93, 0.89),
  });
  page.drawText("PROPOSAL", {
    x: 410,
    y: 762,
    size: 18,
    font: serif,
    color: rgb(0.95, 0.93, 0.89),
  });

  let y = 700;
  page.drawText(proposal.title, { x: 48, y, size: 16, font: serif, color: ink });
  y -= 20;
  page.drawText(`Prepared for ${proposal.clientName}`, { x: 48, y, size: 10, font: body, color: muted });
  if (proposal.validUntil) {
    page.drawText(`Valid through ${format(proposal.validUntil, "MMM d, yyyy")}`, {
      x: 360,
      y,
      size: 10,
      font: body,
      color: muted,
    });
  }

  y -= 36;
  for (const section of proposal.sections) {
    page.drawText(section.heading, { x: 48, y, size: 12, font: bodyBold, color: rust });
    y -= 16;
    const wrapped = wrap(section.body, 90);
    for (const line of wrapped.slice(0, 8)) {
      page.drawText(line, { x: 48, y, size: 10, font: body, color: ink });
      y -= 13;
    }
    if (section.amount != null) {
      page.drawText(formatCents(Math.round(section.amount * 100), proposal.currency), {
        x: 48,
        y,
        size: 10,
        font: bodyBold,
        color: ink,
      });
      y -= 16;
    }
    y -= 10;
  }

  page.drawText("Investment", { x: 48, y, size: 10, font: bodyBold, color: muted });
  page.drawText(formatCents(total, proposal.currency), { x: 140, y, size: 12, font: bodyBold, color: ink });

  if (proposal.notes) {
    y -= 28;
    page.drawText(proposal.notes.slice(0, 120), { x: 48, y, size: 9, font: body, color: muted });
  }

  if (branded) {
    page.drawText("Made with InvoiceFlow — invoiceflow.dev", {
      x: 48,
      y: 36,
      size: 8,
      font: body,
      color: muted,
    });
  }

  return pdf.save();
}

function wrap(text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}
