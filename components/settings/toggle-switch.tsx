"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ToggleSwitch({
  name,
  defaultChecked = false,
  label,
}: {
  name: string;
  defaultChecked?: boolean;
  label?: string;
}) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className={cn("flex items-center gap-4 py-3", label ? "justify-between" : "justify-end")}>
      {label ? <span className="text-sm">{label}</span> : null}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label ?? name}
        onClick={() => setOn((value) => !value)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          on ? "bg-accent" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-sm transition-transform",
            on ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
      <input type="hidden" name={name} value={on ? "on" : "off"} />
    </div>
  );
}
