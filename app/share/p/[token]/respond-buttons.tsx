"use client";

import { respondToProposal } from "@/app/actions/proposals";
import { Button } from "@/components/ui/button";

export function ProposalResponse({ token, status }: { token: string; status: string }) {
  if (status === "accepted" || status === "declined") {
    return (
      <p className="rounded-2xl bg-muted px-4 py-3 text-sm">
        This proposal was {status}.
      </p>
    );
  }
  return (
    <div className="flex gap-2">
      <form action={respondToProposal.bind(null, token, "accepted")}>
        <Button type="submit">Accept</Button>
      </form>
      <form action={respondToProposal.bind(null, token, "declined")}>
        <Button type="submit" variant="outline">
          Decline
        </Button>
      </form>
    </div>
  );
}
