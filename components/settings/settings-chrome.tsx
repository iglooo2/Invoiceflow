import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SettingsToolbar({
  cancelHref = "/dashboard/settings/account",
  saveLabel,
  cancelLabel,
  extra,
}: {
  cancelHref?: string;
  saveLabel: string;
  cancelLabel: string;
  extra?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
      {extra}
      <Button asChild variant="outline" type="button">
        <Link href={cancelHref}>{cancelLabel}</Link>
      </Button>
      <Button type="submit">{saveLabel}</Button>
    </div>
  );
}

export function SettingsBanner({
  error,
  saved,
  savedLabel,
}: {
  error?: string | null;
  saved?: boolean;
  savedLabel: string;
}) {
  if (!error && !saved) return null;
  if (error) {
    return (
      <p role="alert" className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  return (
    <p className="mb-4 rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">{savedLabel}</p>
  );
}

export function SchemaWarning({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm">
      {message} Use <code>npm run db:push:prod</code> against the Neon direct URL, or{" "}
      <code>prisma/add-settings-columns.sql</code>.
    </p>
  );
}

export function ProBadge({ label }: { label: string }) {
  return (
    <span className="ml-2 inline-flex rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
      {label}
    </span>
  );
}
