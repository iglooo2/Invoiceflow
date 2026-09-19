"use client";

import { respondToProposal } from "@/app/actions/proposals";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ProposalResponse({ token, status }: { token: string; status: string }) {
  if (status === "accepted" || status === "declined") {
    return (
      <p className="rounded-2xl bg-muted px-4 py-3 text-sm">
        This estimate was {status === "accepted" ? "approved" : "declined"}.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:min-w-[280px]">
      <form action={respondToProposal} className="grid gap-2">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="decision" value="accepted" />
        <div className="grid gap-1">
          <Label htmlFor="signedName">Type your name to approve</Label>
          <Input id="signedName" name="signedName" required minLength={2} placeholder="Full name" />
        </div>
        <Button type="submit">Approve estimate</Button>
      </form>
      <form action={respondToProposal}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="decision" value="declined" />
        <Button type="submit" variant="outline">
          Decline
        </Button>
      </form>
    </div>
  );
}
