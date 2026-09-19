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
    <div className={cn("flex items-center gap-4 py-3", label ? "w-full justify-between" : "justify-end")}>
      {label ? <span className="min-w-0 text-sm">{label}</span> : null}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label ?? name}
        onClick={() => setOn((value) => !value)}
        className="inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center appearance-none border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <span
          className={cn(
            "pointer-events-none flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
            on ? "bg-accent" : "bg-border",
          )}
        >
          <span
            className={cn(
              "block size-4 rounded-full bg-card shadow-sm transition-transform duration-200 ease-out",
              on ? "translate-x-4" : "translate-x-0",
            )}
          />
        </span>
      </button>
      <input type="hidden" name={name} value={on ? "on" : "off"} />
    </div>
  );
}
