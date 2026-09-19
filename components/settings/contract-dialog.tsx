"use client";

import { useState } from "react";
import { deleteContract, saveContract } from "@/app/actions/settings";
import { ToggleSwitch } from "@/components/settings/toggle-switch";
import { Button } from "@/components/ui/button";
import { OutlinedField, OutlinedTextarea } from "@/components/ui/outlined-field";

export type ContractRecord = {
  id: string;
  name: string;
  details: string;
  defaultForEstimates: boolean;
  defaultForInvoices: boolean;
};

export function ContractDialog({
  contract,
  copy,
  trigger,
}: {
  contract?: ContractRecord | null;
  copy: {
    new: string;
    edit: string;
    name: string;
    details: string;
    defaultEstimate: string;
    defaultInvoice: string;
    delete: string;
    cancel: string;
    save: string;
    triggerLabel?: string;
  };
  trigger: "new" | "row";
}) {
  const [open, setOpen] = useState(false);
  const creating = !contract;
  return (
    <>
      {trigger === "new" ? (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {copy.triggerLabel ?? copy.new}
        </Button>
      ) : (
        <button type="button" className="w-full py-4 text-left" onClick={() => setOpen(true)}>
          <p className="text-sm text-muted-foreground">{contract?.name}</p>
          <p className="mt-1 line-clamp-2 text-sm">{contract?.details}</p>
        </button>
      )}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-xl">
            <form action={saveContract} className="grid">
              {contract ? <input type="hidden" name="contractId" value={contract.id} /> : null}
              <div className="grid gap-2 p-6">
                <h2 className="font-display text-2xl">{creating ? copy.new : copy.edit}</h2>
                <div className="divide-y divide-border">
                  <ToggleSwitch
                    name="defaultForEstimates"
                    defaultChecked={contract?.defaultForEstimates}
                    label={copy.defaultEstimate}
                  />
                  <ToggleSwitch
                    name="defaultForInvoices"
                    defaultChecked={contract?.defaultForInvoices}
                    label={copy.defaultInvoice}
                  />
                </div>
                <div className="mt-4 grid gap-5">
                  <OutlinedField label={copy.name} name="name" defaultValue={contract?.name} required />
                  <OutlinedTextarea
                    label={copy.details}
                    name="details"
                    defaultValue={contract?.details}
                    rows={8}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-3">
                {contract ? (
                  <Button form="delete-contract" type="submit" variant="ghost" className="text-destructive">
                    {copy.delete}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="btn-row">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    {copy.cancel}
                  </Button>
                  <Button type="submit" variant="ghost" className="text-accent">
                    {copy.save}
                  </Button>
                </div>
              </div>
            </form>
            {contract ? (
              <form id="delete-contract" action={deleteContract} className="hidden">
                <input type="hidden" name="contractId" value={contract.id} />
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
