"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarPlus, FileText, Plus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/settings/toggle-switch";
import { JOB_LIST_PATH, dateInputValue } from "@/lib/jobs";
import type { JobFormCopy } from "@/lib/job-copy";

export type JobFormAction = (formData: FormData) => Promise<{ error?: string } | void>;

export type JobClientOption = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  address: string | null;
};

export type JobEstimateOption = {
  id: string;
  title: string;
  clientName: string;
};

export type JobInvoiceOption = {
  id: string;
  number: string;
  clientName: string;
};

export type JobFormVisit = {
  notes: string;
  scheduledAt: string;
};

export function JobForm({
  action,
  copy,
  clients,
  estimates,
  invoices,
  formError,
  jobId,
  initial,
}: {
  action: JobFormAction;
  copy: JobFormCopy;
  clients: JobClientOption[];
  estimates: JobEstimateOption[];
  invoices: JobInvoiceOption[];
  formError?: string | null;
  jobId?: string;
  initial?: {
    title: string;
    clientId?: string | null;
    address?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    notes?: string | null;
    status?: string;
    estimateIds?: string[];
    invoiceIds?: string[];
    visits?: JobFormVisit[];
    jobNumber?: string;
  };
}) {
  const [error, setError] = useState(formError ?? null);
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [pickingClient, setPickingClient] = useState(false);
  const [estimateIds, setEstimateIds] = useState<string[]>(initial?.estimateIds ?? []);
  const [invoiceIds, setInvoiceIds] = useState<string[]>(initial?.invoiceIds ?? []);
  const [pickingEstimates, setPickingEstimates] = useState(false);
  const [pickingInvoices, setPickingInvoices] = useState(false);
  const [visits, setVisits] = useState<JobFormVisit[]>(initial?.visits ?? []);

  const selectedClient = clients.find((client) => client.id === clientId);

  const selectedEstimates = useMemo(
    () => estimates.filter((item) => estimateIds.includes(item.id)),
    [estimates, estimateIds],
  );
  const selectedInvoices = useMemo(
    () => invoices.filter((item) => invoiceIds.includes(item.id)),
    [invoices, invoiceIds],
  );

  function chooseClient(client: JobClientOption) {
    setClientId(client.id);
    if (!address.trim() && client.address) setAddress(client.address);
    setPickingClient(false);
  }

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  return (
    <form
      className="grid gap-6"
      action={async (formData) => {
        setError(null);
        const result = await action(formData);
        if (result?.error) setError(result.error);
      }}
    >
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="address" value={address} />
      <input type="hidden" name="estimateIdsJson" value={JSON.stringify(estimateIds)} />
      <input type="hidden" name="invoiceIdsJson" value={JSON.stringify(invoiceIds)} />
      <input type="hidden" name="visitsJson" value={JSON.stringify(visits)} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-4xl">{jobId ? copy.editTitle : copy.newTitle}</h1>
          {initial?.jobNumber ? (
            <p className="text-sm text-muted-foreground">{copy.jobNumber.replace("{number}", initial.jobNumber)}</p>
          ) : null}
        </div>
        <div className="btn-row justify-end">
          <Button asChild variant="outline">
            <Link href={JOB_LIST_PATH}>{copy.cancel}</Link>
          </Button>
          <Button type="submit" variant="secondary">
            {copy.save}
          </Button>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">{error}</p> : null}

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">{copy.details}</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <Input
            name="title"
            required
            defaultValue={initial?.title ?? ""}
            placeholder={copy.title}
            aria-label={copy.title}
            className="h-12 rounded-xl"
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickingClient((open) => !open)}
              className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-card px-4 py-6 text-sm text-accent hover:bg-accent/5"
            >
              <UserPlus className="size-6" />
              <span className="font-medium">
                {selectedClient ? selectedClient.name : `+ ${copy.addClient}`}
              </span>
              {selectedClient?.company ? (
                <span className="text-xs text-muted-foreground">{selectedClient.company}</span>
              ) : null}
            </button>
            {pickingClient ? (
              <div className="absolute right-0 z-20 mt-2 w-full min-w-64 rounded-2xl border border-border bg-card p-2 shadow-lg">
                {clients.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">{copy.noClients}</p>
                ) : (
                  <ul className="max-h-56 overflow-y-auto">
                    {clients.map((client) => (
                      <li key={client.id}>
                        <button
                          type="button"
                          onClick={() => chooseClient(client)}
                          className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span className="font-medium">{client.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {[client.company, client.email].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedClient ? (
                  <button
                    type="button"
                    onClick={() => {
                      setClientId("");
                      setPickingClient(false);
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  >
                    {copy.removeClient}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">{copy.dates}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{copy.startDate}</span>
            <Input name="startDate" type="date" defaultValue={dateInputValue(initial?.startDate)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{copy.endDate}</span>
            <Input name="endDate" type="date" defaultValue={dateInputValue(initial?.endDate)} />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">{copy.documents}</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-border">
          <DocumentColumn
            title={copy.estimates}
            actionLabel={`+ ${copy.linkEstimates}`}
            empty={copy.noEstimates}
            open={pickingEstimates}
            onToggle={() => setPickingEstimates((value) => !value)}
            options={estimates.map((item) => ({
              id: item.id,
              label: item.title,
              hint: item.clientName,
            }))}
            selectedIds={estimateIds}
            selected={selectedEstimates.map((item) => ({ id: item.id, label: item.title }))}
            onToggleId={(id) => {
              setEstimateIds((current) => toggleId(current, id));
              setPickingEstimates(false);
            }}
            icon={<FileText className="size-3.5" />}
          />
          <DocumentColumn
            title={copy.invoices}
            actionLabel={`+ ${copy.linkInvoices}`}
            empty={copy.noInvoices}
            open={pickingInvoices}
            onToggle={() => setPickingInvoices((value) => !value)}
            options={invoices.map((item) => ({
              id: item.id,
              label: item.number,
              hint: item.clientName,
            }))}
            selectedIds={invoiceIds}
            selected={selectedInvoices.map((item) => ({ id: item.id, label: item.number }))}
            onToggleId={(id) => {
              setInvoiceIds((current) => toggleId(current, id));
              setPickingInvoices(false);
            }}
            icon={<FileText className="size-3.5" />}
            className="lg:pl-6"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">{copy.scheduling}</h2>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm font-medium">{copy.visits}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisits((current) => [...current, { notes: "", scheduledAt: "" }])}
          >
            <CalendarPlus />
            {`+ ${copy.createVisit}`}
          </Button>
        </div>
        {visits.length ? (
          <ul className="mt-4 grid gap-3">
            {visits.map((visit, index) => (
              <li key={`${visit.scheduledAt}-${index}`} className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[10rem_1fr_auto]">
                <Input
                  type="date"
                  aria-label={copy.visitDate}
                  value={visit.scheduledAt}
                  onChange={(event) => {
                    const value = event.target.value;
                    setVisits((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, scheduledAt: value } : row)));
                  }}
                />
                <Input
                  aria-label={copy.visitNotes}
                  placeholder={copy.visitNotes}
                  value={visit.notes}
                  onChange={(event) => {
                    const value = event.target.value;
                    setVisits((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, notes: value } : row)));
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisits((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                >
                  <X />
                  {copy.removeVisit}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">{copy.notes}</h2>
        <Textarea
          name="notes"
          className="mt-5 min-h-16"
          defaultValue={initial?.notes ?? ""}
          placeholder={copy.notesPlaceholder}
        />
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl">{copy.actions}</h2>
        <div className="mt-4 flex items-center gap-3">
          <ToggleSwitch name="completed" defaultChecked={initial?.status === "complete"} />
          <span className="text-sm">{copy.markCompleted}</span>
        </div>
      </section>
    </form>
  );
}

function DocumentColumn({
  title,
  actionLabel,
  empty,
  open,
  onToggle,
  options,
  selectedIds,
  selected,
  onToggleId,
  icon,
  className,
}: {
  title: string;
  actionLabel: string;
  empty: string;
  open: boolean;
  onToggle: () => void;
  options: Array<{ id: string; label: string; hint?: string }>;
  selectedIds: string[];
  selected: Array<{ id: string; label: string }>;
  onToggleId: (id: string) => void;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Button type="button" variant="outline" onClick={onToggle}>
          {icon}
          {actionLabel}
        </Button>
      </div>
      {selected.length ? (
        <ul className="mt-3 grid gap-2">
          {selected.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span>{item.label}</span>
              <button type="button" onClick={() => onToggleId(item.id)} className="text-muted-foreground hover:text-foreground" aria-label={item.label}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <div className="mt-3 rounded-2xl border border-border p-2">
          {options.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">{empty}</p>
          ) : (
            <ul className="max-h-52 overflow-y-auto">
              {options.map((item) => {
                const checked = selectedIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onToggleId(item.id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        <span className="font-medium">{item.label}</span>
                        {item.hint ? <span className="block text-xs text-muted-foreground">{item.hint}</span> : null}
                      </span>
                      <Plus className={checked ? "size-3.5 rotate-45 text-primary" : "size-3.5 text-muted-foreground"} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
