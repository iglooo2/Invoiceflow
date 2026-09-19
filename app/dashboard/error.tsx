"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[40vh] place-content-center gap-4 text-center">
      <h1 className="font-display text-4xl">This page couldn’t load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        A server error occurred. If this is the Estimates list after a deploy, from a laptop run{" "}
        <code className="rounded bg-muted px-1">npm run db:push:prod</code> against your Neon direct URL, then reload.
      </p>
      {error?.digest ? <p className="text-xs text-muted-foreground">Error {error.digest}</p> : null}
      <Button type="button" onClick={() => retry()}>
        Reload
      </Button>
    </div>
  );
}
