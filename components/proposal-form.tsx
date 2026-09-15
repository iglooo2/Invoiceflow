"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatCents, proposalTotalCents } from "@/lib/money";

type Section = { heading: string; body: string; amount: string };
type ClientOption = { id: string; name: string; email: string | null; company: string | null };

export function ProposalForm({
  action,
  clients,
  initial,
}: {
  action: (formData: FormData) => Promise<void>;
  clients: ClientOption[];
  initial?: {
    clientId?: string | null;
    title: string;
    clientName: string;
    clientEmail?: string | null;
    clientCompany?: string | null;
    validUntil?: string;
    notes?: string | null;
    status: string;
    sections: { heading: string; body: string; amount: number | null }[];
  };
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientCompany, setClientCompany] = useState(initial?.clientCompany ?? "");
  const [sections, setSections] = useState<Section[]>(
    initial?.sections?.map((section) => ({
      heading: section.heading,
      body: section.body,
      amount: section.amount == null ? "" : String(section.amount),
    })) ?? [{ heading: "Scope", body: "", amount: "" }],
  );

  function applyClient(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    setClientName(client.name);
    setClientEmail(client.email ?? "");
    setClientCompany(client.company ?? "");
  }

  const total = proposalTotalCents(
    sections.map((section) => ({ amount: section.amount === "" ? null : Number(section.amount) })),
  );

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="sectionsJson" value={JSON.stringify(sections)} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={initial?.title} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
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
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Sections</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSections([...sections, { heading: "", body: "", amount: "" }])}
          >
            Add section
          </Button>
        </div>
        {sections.map((section, index) => (
          <div key={index} className="grid gap-2 rounded-2xl border border-border p-4">
            <Input
              placeholder="Heading"
              value={section.heading}
              onChange={(e) => {
                const next = [...sections];
                next[index] = { ...section, heading: e.target.value };
                setSections(next);
              }}
            />
            <Textarea
              placeholder="What you’ll make, how you’ll work, what’s included…"
              value={section.body}
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
                placeholder="Optional price"
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
                onClick={() => setSections(sections.filter((_, i) => i !== index))}
                disabled={sections.length === 1}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <p className="text-right text-sm">Investment {formatCents(total)}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save proposal</Button>
      </div>
    </form>
  );
}
