import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function OutlinedField({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  autoComplete,
  className,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <label className={cn("relative block", className)}>
      <span className="absolute -top-2 left-3 z-10 bg-card px-1 text-xs text-muted-foreground">{label}</span>
      {children ?? (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          defaultValue={defaultValue ?? ""}
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none ring-ring placeholder:text-muted-foreground focus:ring-2"
        />
      )}
    </label>
  );
}

export function OutlinedSelect({
  label,
  name,
  defaultValue,
  children,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <OutlinedField label={label} name={name} className={className}>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-12 w-full appearance-none rounded-xl border border-border bg-card px-3 text-sm outline-none ring-ring focus:ring-2"
      >
        {children}
      </select>
    </OutlinedField>
  );
}

export function OutlinedTextarea({
  label,
  name,
  defaultValue,
  rows = 3,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  className?: string;
}) {
  return (
    <OutlinedField label={label} name={name} className={className}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none ring-ring placeholder:text-muted-foreground focus:ring-2"
      />
    </OutlinedField>
  );
}
