import { parseAttachmentsJson } from "@/lib/estimates";
import { estimateTotals, formatCents, invoiceTotals } from "@/lib/money";

/**
 * Tiny PDF 1.4 writer for Cloudflare Workers.
 *
 * pdf-lib + @pdf-lib/standard-fonts inflate AFM data and compress streams on
 * every request. On OpenNext that extra CPU/memory (on top of Prisma WASM)
 * trips Error 1102: "Worker exceeded resource limits".
 *
 * This path references the 14 standard Type1 fonts (no embedding, no pako,
 * no Buffer copies) and emits an uncompressed content stream.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 48;
const MARGIN_BOTTOM = 56;
const HEADER_TOP = 742;

const ink = rgb(0.11, 0.1, 0.09);
const muted = rgb(0.42, 0.38, 0.34);
const rust = rgb(0.77, 0.36, 0.15);
const paper = rgb(0.96, 0.93, 0.89);
const rule = rgb(0.85, 0.81, 0.76);
const cream = rgb(1, 0.98, 0.96);
const proposalBar = rgb(0.12, 0.31, 0.27);
const proposalCream = rgb(0.95, 0.93, 0.89);

type RGB = { r: number; g: number; b: number };
type FontId = "F1" | "F2" | "F3";

type Studio = {
  businessName?: string | null;
  name?: string | null;
  businessEmail?: string | null;
  email?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  website?: string | null;
  footerMessage?: string | null;
};

function rgb(r: number, g: number, b: number): RGB {
  return { r, g, b };
}

function studioLabel(studio: Studio) {
  return studio.businessName || studio.name || "Studio";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMdY(date: Date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Helvetica / Helvetica-Bold / Times-Bold widths (1/1000 em) for codes 32–126. */
const WIDTHS: Record<FontId, number[]> = {
  F1: [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
    611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
    667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
    222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
  ],
  F2: [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
    556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
    611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
    667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
    278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
  ],
  F3: [
    250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250, 278, 500, 500, 500,
    500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500, 930, 722, 667, 722, 722, 667,
    611, 778, 778, 389, 500, 778, 667, 944, 722, 778, 611, 778, 722, 556, 667, 722, 722, 1000, 722,
    722, 667, 333, 278, 333, 581, 500, 333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556,
    278, 833, 556, 500, 556, 556, 444, 389, 333, 556, 500, 722, 500, 500, 444, 394, 220, 394, 520,
  ],
};

const WINANSI_EXTRA: Record<number, number> = {
  0x0152: 0x8c,
  0x0153: 0x9c,
  0x0160: 0x8a,
  0x0161: 0x9a,
  0x0178: 0x9f,
  0x017d: 0x8e,
  0x017e: 0x9e,
  0x0192: 0x83,
  0x02c6: 0x88,
  0x02dc: 0x98,
  0x2013: 0x96,
  0x2014: 0x97,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201a: 0x82,
  0x201c: 0x93,
  0x201d: 0x94,
  0x201e: 0x84,
  0x2020: 0x86,
  0x2021: 0x87,
  0x2022: 0x95,
  0x2026: 0x85,
  0x2030: 0x89,
  0x2039: 0x8b,
  0x203a: 0x9b,
  0x20ac: 0x80,
  0x2122: 0x99,
};

export function toWinAnsi(text: string) {
  let out = "";
  for (const ch of text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")) {
    if (ch === "\n" || ch === "\t") {
      out += ch === "\t" ? "    " : " ";
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32) continue;
    if (code === 0x00a0) {
      out += " ";
      continue;
    }
    if (code < 127) {
      out += ch;
      continue;
    }
    if (code >= 0xa0 && code <= 0xff) {
      out += ch;
      continue;
    }
    const mapped = WINANSI_EXTRA[code];
    out += mapped ? String.fromCharCode(mapped) : "?";
  }
  return out;
}

function pdfEscape(text: string) {
  return toWinAnsi(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfString(text: string) {
  return `(${pdfEscape(text)})`;
}

function n(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function colorOp(color: RGB) {
  return `${n(color.r)} ${n(color.g)} ${n(color.b)}`;
}

function textWidth(text: string, font: FontId, size: number) {
  const table = WIDTHS[font];
  let units = 0;
  for (const ch of toWinAnsi(text)) {
    const idx = ch.charCodeAt(0) - 32;
    units += idx >= 0 && idx < table.length ? table[idx] : 600;
  }
  return (units * size) / 1000;
}

function latin1Bytes(source: string) {
  const bytes = new Uint8Array(source.length);
  for (let i = 0; i < source.length; i += 1) {
    bytes[i] = source.charCodeAt(i) & 0xff;
  }
  return bytes;
}

class PageCanvas {
  readonly width = PAGE_WIDTH;
  readonly height = PAGE_HEIGHT;
  private readonly ops: string[] = [];

  fillRect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops.push(`${colorOp(color)} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, thickness = 0.5) {
    this.ops.push(
      `${colorOp(color)} RG ${n(thickness)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`,
    );
  }

  text(
    value: string,
    x: number,
    y: number,
    options: { font?: FontId; size?: number; color?: RGB } = {},
  ) {
    if (!value) return;
    const font = options.font ?? "F1";
    const size = options.size ?? 10;
    const color = options.color ?? ink;
    this.ops.push(
      `BT /${font} ${n(size)} Tf ${colorOp(color)} rg ${n(x)} ${n(y)} Td ${pdfString(value)} Tj ET`,
    );
  }

  textRight(
    value: string,
    rightX: number,
    y: number,
    options: { font?: FontId; size?: number; color?: RGB } = {},
  ) {
    const font = options.font ?? "F1";
    const size = options.size ?? 10;
    this.text(value, rightX - textWidth(value, font, size), y, options);
  }

  content() {
    return this.ops.join("\n");
  }
}

function assemblePdf(pages: PageCanvas[]) {
  const fontBodies = [
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>",
  ];
  const firstPageObj = 6;
  const pageObjNums = pages.map((_, index) => firstPageObj + index * 2);
  const contentObjNums = pages.map((_, index) => firstPageObj + index * 2 + 1);

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjNums.map((num) => `${num} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    ...fontBodies,
  ];

  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i]!;
    const stream = page.content();
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Contents ${contentObjNums[i]} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  const header = "%PDF-1.4\n%\x80\x81\x82\x83\n";
  const parts: string[] = [header];
  const offsets = [0];
  let cursor = header.length;
  objects.forEach((body, index) => {
    const object = `${index + 1} 0 obj\n${body}\nendobj\n`;
    offsets.push(cursor);
    parts.push(object);
    cursor += object.length;
  });

  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`;
  parts.push(xref, trailer);
  return latin1Bytes(parts.join(""));
}

function wrap(text: string, width: number) {
  const clipped = text.length > 2_000 ? text.slice(0, 2_000) : text;
  const words = clipped.split(/\s+/).filter(Boolean);
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

export function sanitizePdfFilename(name: string) {
  const trimmed = name.replace(/["'\\/]+/g, "").trim();
  const base = trimmed
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return "document.pdf";
  const lower = base.toLowerCase();
  return lower.endsWith(".pdf") ? lower : `${lower}.pdf`;
}

export function pdfDownloadHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${sanitizePdfFilename(filename)}"`,
    "Cache-Control": "private, no-store",
  };
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
  const items = invoice.items.slice(0, 80);
  const totals = invoiceTotals(items, invoice.taxRate);
  const pages: PageCanvas[] = [];

  const paintChrome = (page: PageCanvas) => {
    page.fillRect(0, HEADER_TOP, PAGE_WIDTH, 50, rust);
    page.text(studioLabel(studio).toUpperCase(), MARGIN_X, 762, {
      font: "F2",
      size: 14,
      color: cream,
    });
    page.text("INVOICE", 430, 762, { font: "F3", size: 18, color: cream });
    if (branded) {
      page.text("Made with InvoiceFlow Studio — invoiceflowstudio.com", MARGIN_X, 36, {
        size: 8,
        color: muted,
      });
    }
  };

  const addPage = () => {
    const page = new PageCanvas();
    paintChrome(page);
    pages.push(page);
    return page;
  };

  let page = addPage();
  let y = 700;

  const ensureRoom = (needed: number) => {
    if (y - needed >= MARGIN_BOTTOM) return;
    page = addPage();
    y = 700;
  };

  page.text(invoice.number, MARGIN_X, y, { font: "F2", size: 12 });
  page.textRight(invoice.status.toUpperCase(), 564, y, { font: "F2", size: 10, color: rust });
  y -= 22;
  page.text(`Issued ${formatMdY(invoice.issueDate)}`, MARGIN_X, y, { size: 10, color: muted });
  if (invoice.dueDate) {
    page.text(`Due ${formatMdY(invoice.dueDate)}`, 220, y, { size: 10, color: muted });
  }

  y -= 36;
  page.text("FROM", MARGIN_X, y, { font: "F2", size: 8, color: muted });
  page.text("BILL TO", 320, y, { font: "F2", size: 8, color: muted });
  y -= 16;
  page.text(studioLabel(studio), MARGIN_X, y, { font: "F2", size: 11 });
  page.text(invoice.clientName, 320, y, { font: "F2", size: 11 });
  y -= 14;
  const fromLines = [
    studio.businessEmail || studio.email,
    studio.businessPhone,
    studio.businessAddress,
    studio.website,
  ].filter(Boolean) as string[];
  const toLines = [invoice.clientCompany, invoice.clientEmail, invoice.clientAddress].filter(
    Boolean,
  ) as string[];
  const lines = Math.max(fromLines.length, toLines.length, 1);
  for (let i = 0; i < lines; i += 1) {
    ensureRoom(12);
    if (fromLines[i]) page.text(fromLines[i], MARGIN_X, y, { size: 9, color: muted });
    if (toLines[i]) page.text(toLines[i], 320, y, { size: 9, color: muted });
    y -= 12;
  }

  y -= 18;
  ensureRoom(40);
  page.fillRect(MARGIN_X, y - 6, 516, 22, paper);
  page.text("Description", 56, y, { font: "F2", size: 9, color: muted });
  page.text("Qty", 360, y, { font: "F2", size: 9, color: muted });
  page.text("Rate", 420, y, { font: "F2", size: 9, color: muted });
  page.textRight("Amount", 564, y, { font: "F2", size: 9, color: muted });
  y -= 28;

  for (const item of items) {
    ensureRoom(22);
    const amount = formatCents(Math.round(item.quantity * item.rate * 100), invoice.currency);
    page.text(item.description.slice(0, 48), 56, y, { size: 10 });
    page.text(String(item.quantity), 360, y, { size: 10 });
    page.text(formatCents(Math.round(item.rate * 100), invoice.currency), 420, y, { size: 10 });
    page.textRight(amount, 564, y, { size: 10 });
    y -= 18;
    page.line(MARGIN_X, y + 10, 564, y + 10, rule);
  }

  y -= 8;
  const summary = [
    ["Subtotal", totals.subtotalCents],
    [`Tax (${invoice.taxRate}%)`, totals.taxCents],
    ["Total due", totals.totalCents],
  ] as const;
  for (const [label, cents] of summary) {
    ensureRoom(16);
    const font: FontId = label === "Total due" ? "F2" : "F1";
    page.text(label, 380, y, { font, size: 10 });
    page.textRight(formatCents(cents, invoice.currency), 564, y, { font, size: 10 });
    y -= 16;
  }

  if (invoice.notes) {
    y -= 12;
    ensureRoom(28);
    page.text("Notes", MARGIN_X, y, { font: "F2", size: 9, color: muted });
    y -= 14;
    for (const line of wrap(invoice.notes, 90).slice(0, 8)) {
      ensureRoom(12);
      page.text(line, MARGIN_X, y, { size: 9 });
      y -= 12;
    }
  }

  if (studio.footerMessage) {
    y -= 16;
    ensureRoom(28);
    page.text("Additional notes", MARGIN_X, y, { font: "F2", size: 9, color: muted });
    y -= 14;
    for (const line of wrap(studio.footerMessage, 90).slice(0, 6)) {
      ensureRoom(12);
      page.text(line, MARGIN_X, y, { size: 9 });
      y -= 12;
    }
  }

  return assemblePdf(pages);
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
    taxRate?: number;
    markupRate?: number;
    signedName?: string | null;
    attachments?: { name: string }[] | string | null;
    sections: { heading: string; body: string; amount: number | null }[];
  };
  branded: boolean;
}) {
  const { proposal, studio, branded } = options;
  const sections = proposal.sections.slice(0, 40);
  const totals = estimateTotals(sections, proposal.taxRate ?? 0, proposal.markupRate ?? 0);
  const attachments = Array.isArray(proposal.attachments)
    ? proposal.attachments
    : parseAttachmentsJson(proposal.attachments);
  const pages: PageCanvas[] = [];

  const paintChrome = (page: PageCanvas) => {
    page.fillRect(0, HEADER_TOP, PAGE_WIDTH, 50, proposalBar);
    page.text(studioLabel(studio).toUpperCase(), MARGIN_X, 762, {
      font: "F2",
      size: 14,
      color: proposalCream,
    });
    page.text("ESTIMATE", 410, 762, { font: "F3", size: 18, color: proposalCream });
    if (branded) {
      page.text("Made with InvoiceFlow Studio — invoiceflowstudio.com", MARGIN_X, 36, {
        size: 8,
        color: muted,
      });
    }
  };

  const addPage = () => {
    const page = new PageCanvas();
    paintChrome(page);
    pages.push(page);
    return page;
  };

  let page = addPage();
  let y = 700;

  const ensureRoom = (needed: number) => {
    if (y - needed >= MARGIN_BOTTOM) return;
    page = addPage();
    y = 700;
  };

  page.text(proposal.title, MARGIN_X, y, { font: "F3", size: 16 });
  y -= 20;
  page.text(`Prepared for ${proposal.clientName}`, MARGIN_X, y, { size: 10, color: muted });
  if (proposal.validUntil) {
    page.text(`Valid through ${formatMdY(proposal.validUntil)}`, 360, y, {
      size: 10,
      color: muted,
    });
  }

  y -= 36;
  for (const section of sections) {
    ensureRoom(40);
    page.text(section.heading, MARGIN_X, y, { font: "F2", size: 12, color: rust });
    y -= 16;
    for (const line of wrap(section.body, 90).slice(0, 8)) {
      ensureRoom(13);
      page.text(line, MARGIN_X, y, { size: 10 });
      y -= 13;
    }
    if (section.amount != null) {
      ensureRoom(16);
      page.text(formatCents(Math.round(section.amount * 100), proposal.currency), MARGIN_X, y, {
        font: "F2",
        size: 10,
      });
      y -= 16;
    }
    y -= 10;
  }

  ensureRoom(56);
  page.text("Subtotal", MARGIN_X, y, { font: "F2", size: 10, color: muted });
  page.text(formatCents(totals.subtotalCents, proposal.currency), 140, y, { font: "F2", size: 10 });
  if (totals.markupCents > 0) {
    y -= 14;
    page.text(`Markup (${proposal.markupRate ?? 0}%)`, MARGIN_X, y, { font: "F2", size: 10, color: muted });
    page.text(formatCents(totals.markupCents, proposal.currency), 140, y, { font: "F2", size: 10 });
  }
  if (totals.taxCents > 0) {
    y -= 14;
    page.text(`Tax (${proposal.taxRate ?? 0}%)`, MARGIN_X, y, { font: "F2", size: 10, color: muted });
    page.text(formatCents(totals.taxCents, proposal.currency), 140, y, { font: "F2", size: 10 });
  }
  y -= 16;
  page.text("Investment", MARGIN_X, y, { font: "F2", size: 10, color: muted });
  page.text(formatCents(totals.totalCents, proposal.currency), 140, y, { font: "F2", size: 12 });
  if (proposal.signedName) {
    y -= 18;
    page.text(`Approved by ${proposal.signedName}`, MARGIN_X, y, { size: 9, color: muted });
  }
  if (attachments.length) {
    y -= 18;
    page.text("Attached", MARGIN_X, y, { font: "F2", size: 9, color: muted });
    for (const file of attachments.slice(0, 6)) {
      y -= 12;
      ensureRoom(12);
      page.text(file.name, MARGIN_X, y, { size: 9 });
    }
  }

  if (proposal.notes) {
    y -= 28;
    for (const line of wrap(proposal.notes, 90).slice(0, 4)) {
      ensureRoom(12);
      page.text(line, MARGIN_X, y, { size: 9, color: muted });
      y -= 12;
    }
  }

  if (studio.footerMessage) {
    y -= 16;
    ensureRoom(28);
    page.text("Additional notes", MARGIN_X, y, { font: "F2", size: 9, color: muted });
    y -= 14;
    for (const line of wrap(studio.footerMessage, 90).slice(0, 6)) {
      ensureRoom(12);
      page.text(line, MARGIN_X, y, { size: 9, color: muted });
      y -= 12;
    }
  }

  return assemblePdf(pages);
}
