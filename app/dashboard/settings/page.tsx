import { requestQuickbooksConnect, updateStudio } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  INTUIT_CLIENT_ID_ENV,
  INTUIT_CLIENT_SECRET_ENV,
  INTUIT_REDIRECT_URI_ENV,
  quickbooksConfigured,
  quickbooksRedirectUri,
} from "@/lib/quickbooks";
import { requireUser } from "@/lib/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ qb?: string }>;
}) {
  const user = await requireUser();
  const { qb } = await searchParams;
  const qbReady = quickbooksConfigured();

  return (
    <div className="grid max-w-xl gap-12">
      <div>
        <h1 className="font-display text-4xl">Studio details</h1>
        <p className="mt-2 text-muted-foreground">This is what clients see on invoices, estimates, and PDFs.</p>
        <form action={updateStudio} className="mt-6 grid gap-4">
          <Field label="Your name" name="name" defaultValue={user.name} />
          <Field label="Studio name" name="businessName" defaultValue={user.businessName} />
          <Field label="Studio email" name="businessEmail" defaultValue={user.businessEmail} />
          <Field label="Phone" name="businessPhone" defaultValue={user.businessPhone} />
          <Field label="Website" name="website" defaultValue={user.website} />
          <div className="grid gap-2">
            <Label htmlFor="businessAddress">Address</Label>
            <Textarea id="businessAddress" name="businessAddress" defaultValue={user.businessAddress ?? ""} />
          </div>
          <Button type="submit">Save</Button>
        </form>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">QuickBooks Online</p>
        <h2 className="mt-2 font-display text-3xl">Connect your books</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Sync invoices and estimates with QuickBooks Online so the number you sent is the number your accountant
          sees. One-time connect, then a daily sync — or tap Sync now after a busy day. Live Intuit OAuth is not
          enabled on this release.
        </p>
        {qb === "coming-soon" ? (
          <p className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm">
            Connect QuickBooks is reserved for your studio. Add an Intuit developer app, then set{" "}
            <code>{INTUIT_CLIENT_ID_ENV}</code> and <code>{INTUIT_CLIENT_SECRET_ENV}</code> as Worker secrets.
            Redirect URI: <code className="break-all">{quickbooksRedirectUri()}</code>
          </p>
        ) : null}
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <li>— Automate bookkeeping after you send from InvoiceFlow Studio.</li>
          <li>— Keep invoices and estimates consistent with QuickBooks Online.</li>
          <li>— Accountant stays in QuickBooks; you stay in the studio tool.</li>
          <li>
            — Credentials {qbReady ? "are present" : "are not set yet"} (
            {INTUIT_CLIENT_ID_ENV}, {INTUIT_CLIENT_SECRET_ENV}, optional {INTUIT_REDIRECT_URI_ENV}).
          </li>
        </ul>
        <form action={requestQuickbooksConnect} className="mt-6">
          <Button type="submit" variant={qbReady ? "default" : "outline"}>
            {qbReady ? "Connect QuickBooks (OAuth coming soon)" : "Connect QuickBooks — coming soon"}
          </Button>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
