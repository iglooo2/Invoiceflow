"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatCents, invoiceTotals } from "@/lib/money";

export type InvoiceFormAction = (formData: FormData) => Promise<{ error?: string } | void>;

type Item = { description: string; quantity: string; rate: string };
type ClientOption = { id: string; name: string; email: string | null; company: string | null; address: string | null };

export function InvoiceForm({
  action,
  clients,
  initial,
  formError,
}: {
  action: InvoiceFormAction;
  clients: ClientOption[];
  formError?: string | null;
  initial?: {
    clientId?: string | null;
    clientName: string;
    clientEmail?: string | null;
    clientCompany?: string | null;
    clientAddress?: string | null;
    issueDate: string;
    dueDate?: string;
    taxRate: number;
    notes?: string | null;
    status: string;
    items: { description: string; quantity: number; rate: number }[];
  };
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientCompany, setClientCompany] = useState(initial?.clientCompany ?? "");
  const [clientAddress, setClientAddress] = useState(initial?.clientAddress ?? "");
  const [error, setError] = useState(formError ?? null);
  const [items, setItems] = useState<Item[]>(
    initial?.items?.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      rate: String(item.rate),
    })) ?? [{ description: "", quantity: "1", rate: "0" }],
  );

  const totals = useMemo(
    () =>
      invoiceTotals(
        items.map((item) => ({
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
        })),
        Number(initial?.taxRate ?? 0),
      ),
    [items, initial?.taxRate],
  );

  function applyClient(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    setClientName(client.name);
    setClientEmail(client.email ?? "");
    setClientCompany(client.company ?? "");
    setClientAddress(client.address ?? "");
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
      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="savedClient">Saved client</Label>
          <Select id="savedClient" name="clientId" value={clientId} onChange={(e) => applyClient(e.target.value)}>
            <option value="">Enter a new client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.company ? ` · ${client.company}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="void">Void</option>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client name" name="clientName" value={clientName} onChange={setClientName} required />
        <Field label="Client email" name="clientEmail" type="email" value={clientEmail} onChange={setClientEmail} />
        <Field label="Company" name="clientCompany" value={clientCompany} onChange={setClientCompany} />
        <Field label="Address" name="clientAddress" value={clientAddress} onChange={setClientAddress} />
        <div className="grid gap-2">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" name="issueDate" type="date" defaultValue={initial?.issueDate} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={initial?.dueDate} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="taxRate">Tax %</Label>
          <Input id="taxRate" name="taxRate" type="number" step="0.01" defaultValue={initial?.taxRate ?? 0} />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Line items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems([...items, { description: "", quantity: "1", rate: "0" }])}
          >
            Add line
          </Button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-2xl border border-border p-3 md:grid-cols-[1fr_90px_110px_auto]">
            <Input
              placeholder="Brand workshop, 4K color pass, article draft…"
              value={item.description}
              required
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, description: e.target.value };
                setItems(next);
              }}
            />
            <Input
              type="number"
              step="0.25"
              value={item.quantity}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, quantity: e.target.value };
                setItems(next);
              }}
            />
            <Input
              type="number"
              step="0.01"
              value={item.rate}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, rate: e.target.value };
                setItems(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setItems(items.filter((_, i) => i !== index))}
              disabled={items.length === 1}
            >
              Remove
            </Button>
          </div>
        ))}
        <p className="text-right text-sm text-muted-foreground">
          Subtotal {formatCents(totals.subtotalCents)} · Tax {formatCents(totals.taxCents)} ·{" "}
          <span className="text-foreground">Total {formatCents(totals.totalCents)}</span>
        </p>
        <p className="text-right text-xs text-muted-foreground">
          Totals update from line items. Tax uses the Tax % field when you save.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
          placeholder="Payment schedule, file handoff, late fees…"
        />
      </div>
      <div className="btn-row justify-end">
        <Button type="submit">Save invoice</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
