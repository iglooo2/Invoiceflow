"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { serializeAttachments, ESTIMATE_STATUSES, type EstimateAttachment } from "@/lib/estimates";
import { estimateTotals, formatCents } from "@/lib/money";
import { SAVED_ITEMS_STORAGE_KEY, STUDIO_SAVED_ITEMS, type SavedEstimateItem } from "@/lib/saved-items";

export type ProposalFormAction = (formData: FormData) => Promise<{ error?: string } | void>;

type Section = { heading: string; body: string; amount: string };
type ClientOption = { id: string; name: string; email: string | null; company: string | null };

function readSavedItems(): SavedEstimateItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_ITEMS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedEstimateItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.heading) : [];
  } catch {
    return [];
  }
}

export function ProposalForm({
  action,
  clients,
  initial,
  formError,
}: {
  action: ProposalFormAction;
  clients: ClientOption[];
  formError?: string | null;
  initial?: {
    clientId?: string | null;
    title: string;
    clientName: string;
    clientEmail?: string | null;
    clientCompany?: string | null;
    validUntil?: string;
    notes?: string | null;
    status: string;
    taxRate?: number;
    markupRate?: number;
    attachments?: EstimateAttachment[];
    sections: { heading: string; body: string; amount: number | null }[];
  };
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientCompany, setClientCompany] = useState(initial?.clientCompany ?? "");
  const [error, setError] = useState(formError ?? null);
  const [taxRate, setTaxRate] = useState(String(initial?.taxRate ?? 0));
  const [markupRate, setMarkupRate] = useState(String(initial?.markupRate ?? 0));
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [customSaved, setCustomSaved] = useState<SavedEstimateItem[]>([]);
  const [attachments, setAttachments] = useState<EstimateAttachment[]>(initial?.attachments ?? []);
  const [sections, setSections] = useState<Section[]>(
    initial?.sections?.map((section) => ({
      heading: section.heading,
      body: section.body,
      amount: section.amount == null ? "" : String(section.amount),
    })) ?? [{ heading: "Work", body: "", amount: "" }],
  );

  useEffect(() => {
    setCustomSaved(readSavedItems());
  }, []);

  const savedItems = useMemo(() => [...STUDIO_SAVED_ITEMS, ...customSaved], [customSaved]);

  const totals = estimateTotals(
    sections.map((section) => ({ amount: section.amount === "" ? null : Number(section.amount) })),
    Number(taxRate) || 0,
    Number(markupRate) || 0,
  );

  function applyClient(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    setClientName(client.name);
    setClientEmail(client.email ?? "");
    setClientCompany(client.company ?? "");
  }

  function addSavedItem(index: number) {
    const item = savedItems[index];
    if (!item) return;
    setSections([
      ...sections,
      {
        heading: item.heading,
        body: item.body,
        amount: item.amount == null ? "" : String(item.amount),
      },
    ]);
  }

  function rememberLastLine() {
    const last = sections[sections.length - 1];
    if (!last?.heading.trim()) return;
    const next: SavedEstimateItem = {
      heading: last.heading.trim(),
      body: last.body.trim(),
      amount: last.amount === "" ? null : Number(last.amount),
    };
    const existing = readSavedItems();
    const merged = [...existing.filter((item) => item.heading !== next.heading), next].slice(-12);
    window.localStorage.setItem(SAVED_ITEMS_STORAGE_KEY, JSON.stringify(merged));
    setCustomSaved(merged);
    setSavedNotice(`Saved “${next.heading}” for the next job.`);
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        const result = await action(formData);
        if (result?.error) setError(result.error);
      }}
      className="grid gap-6"
    >
      {error ? (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
        Built for a phone on a jobsite: add line items, price with markup and tax, attach photos, and send
        the link before you leave the driveway.
      </p>
      <input type="hidden" name="sectionsJson" value={JSON.stringify(sections)} />
      <input type="hidden" name="attachmentsJson" value={serializeAttachments(attachments)} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={initial?.title} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "draft"}>
            {ESTIMATE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value === "accepted" ? "Approved" : value[0].toUpperCase() + value.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Saved client</Label>
          <Select name="clientId" value={clientId} onChange={(e) => applyClient(e.target.value)}>
            <option value="">Enter a new client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="validUntil">Valid until</Label>
          <Input id="validUntil" name="validUntil" type="date" defaultValue={initial?.validUntil} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="clientName">Client name</Label>
          <Input id="clientName" name="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="clientEmail">Client email</Label>
          <Input id="clientEmail" name="clientEmail" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="clientCompany">Company</Label>
          <Input id="clientCompany" name="clientCompany" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="font-display text-xl">Line items</h2>
          <div className="btn-row">
            <Select className="min-w-0 flex-1 sm:min-w-56 sm:flex-none" defaultValue="" onChange={(e) => {
              if (e.target.value === "") return;
              addSavedItem(Number(e.target.value));
              e.target.value = "";
            }}>
              <option value="">Add a saved item…</option>
              {savedItems.map((item, index) => (
                <option key={`${item.heading}-${index}`} value={index}>
                  {item.heading}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSections([...sections, { heading: "", body: "", amount: "" }])}
            >
              Add line
            </Button>
          </div>
        </div>
        {sections.map((section, index) => (
          <div key={index} className="grid gap-2 rounded-2xl border border-border p-4">
            <Input
              placeholder="Line item"
              value={section.heading}
              required
              onChange={(e) => {
                const next = [...sections];
                next[index] = { ...section, heading: e.target.value };
                setSections(next);
              }}
            />
            <Textarea
              placeholder="What’s included — labor, materials, finish, what’s out of scope…"
              value={section.body}
              required
              onChange={(e) => {
                const next = [...sections];
                next[index] = { ...section, body: e.target.value };
                setSections(next);
              }}
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Price"
                value={section.amount}
                onChange={(e) => {
                  const next = [...sections];
                  next[index] = { ...section, amount: e.target.value };
                  setSections(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSections(sections.filter((_, i) => i !== index))}
                disabled={sections.length === 1}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={rememberLastLine}>
            Save last line for repeat jobs
          </Button>
          {savedNotice ? <p className="text-sm text-muted-foreground">{savedNotice}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="markupRate">Markup %</Label>
          <Input
            id="markupRate"
            name="markupRate"
            type="number"
            step="0.01"
            min="0"
            value={markupRate}
            onChange={(e) => setMarkupRate(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="taxRate">Tax %</Label>
          <Input
            id="taxRate"
            name="taxRate"
            type="number"
            step="0.01"
            min="0"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </div>
      </div>

      <div className="ml-auto grid w-full max-w-xs gap-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCents(totals.subtotalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span>Markup</span>
          <span>{formatCents(totals.markupCents)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCents(totals.taxCents)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Estimate total</span>
          <span>{formatCents(totals.totalCents)}</span>
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <h2 className="font-display text-xl">Photos & files</h2>
          <p className="text-sm text-muted-foreground">
            Attach names from your camera roll so the client sees what you priced. File hosting ships with
            the next sync pass — names travel with the estimate today.
          </p>
        </div>
        <Input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (!files.length) return;
            setAttachments((current) => [
              ...current,
              ...files.map((file) => ({ name: file.name })),
            ].slice(0, 12));
            event.target.value = "";
          }}
        />
        {attachments.length ? (
          <ul className="grid gap-2">
            {attachments.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-sm">
                <span>{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
      <div className="btn-row justify-end">
        <Button type="submit">Save estimate</Button>
      </div>
    </form>
  );
}
