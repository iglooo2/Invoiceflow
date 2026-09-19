"use client";

import { useState } from "react";
import { createTax } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function NewTaxDialog({
  title,
  nameLabel,
  rateLabel,
  cancelLabel,
  addLabel,
  triggerLabel,
}: {
  title: string;
  nameLabel: string;
  rateLabel: string;
  cancelLabel: string;
  addLabel: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4">
          <form
            action={createTax}
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-xl"
          >
            <div className="grid gap-4 p-6">
              <h2 className="font-display text-2xl">{title}</h2>
              <div className="grid gap-2">
                <Label htmlFor="name">{nameLabel}</Label>
                <Input id="name" name="name" required autoFocus />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate">{rateLabel}</Label>
                <Input id="rate" name="rate" type="number" step="0.01" min="0" max="100" required />
              </div>
            </div>
            <div className="btn-row justify-end border-t border-border px-6 py-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button type="submit" variant="ghost" className="text-accent">
                {addLabel}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
