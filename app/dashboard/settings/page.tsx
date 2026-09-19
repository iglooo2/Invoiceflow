import { requestQuickbooksConnect, updateStudio } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EMPLOYEE_COUNT_KEYS, INDUSTRY_KEYS } from "@/lib/onboarding";
import { appCopy } from "@/lib/i18n-request";
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
  const { dict } = await appCopy();
  const { qb } = await searchParams;
  const qbReady = quickbooksConfigured();
  const copy = dict.app.settingsPage;

  return (
    <div className="grid max-w-xl gap-12">
      <div>
        <h1 className="font-display text-4xl">{copy.title}</h1>
        <p className="mt-2 text-muted-foreground">{copy.lede}</p>
        <form action={updateStudio} className="mt-6 grid gap-4">
          <Field label={copy.yourName} name="name" defaultValue={user.name} />
          <Field label={copy.studioName} name="businessName" defaultValue={user.businessName} />
          <Field label={copy.studioEmail} name="businessEmail" defaultValue={user.businessEmail} />
          <Field label={copy.phone} name="businessPhone" defaultValue={user.businessPhone || user.phone} />
          <div className="grid gap-2">
            <Label htmlFor="employeeCount">{copy.employeeCount}</Label>
            <Select id="employeeCount" name="employeeCount" defaultValue={user.employeeCount ?? ""}>
              <option value="">{copy.employeeCount}</option>
              {EMPLOYEE_COUNT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {dict.onboarding.employees[key]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="industry">{copy.industry}</Label>
            <Select id="industry" name="industry" defaultValue={user.industry ?? ""}>
              <option value="">{copy.industry}</option>
              {INDUSTRY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {dict.onboarding.industries[key]}
                </option>
              ))}
            </Select>
          </div>
          <Field label={copy.website} name="website" defaultValue={user.website} />
          <div className="grid gap-2">
            <Label htmlFor="businessAddress">{copy.address}</Label>
            <Textarea id="businessAddress" name="businessAddress" defaultValue={user.businessAddress ?? ""} />
          </div>
          <Button type="submit">{dict.app.save}</Button>
        </form>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">{copy.qbEyebrow}</p>
        <h2 className="mt-2 font-display text-3xl">{copy.qbTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.qbLede}</p>
        {qb === "coming-soon" ? (
          <p className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm">
            {copy.qbReserved} <code>{INTUIT_CLIENT_ID_ENV}</code> / <code>{INTUIT_CLIENT_SECRET_ENV}</code>.{" "}
            {copy.qbRedirect} <code className="break-all">{quickbooksRedirectUri()}</code>
          </p>
        ) : null}
        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <li>— {copy.qbBullet1}</li>
          <li>— {copy.qbBullet2}</li>
          <li>— {copy.qbBullet3}</li>
          <li>
            — {qbReady ? copy.qbCredsPresent : copy.qbCredsMissing} ({INTUIT_CLIENT_ID_ENV},{" "}
            {INTUIT_CLIENT_SECRET_ENV}, {INTUIT_REDIRECT_URI_ENV})
          </li>
        </ul>
        <form action={requestQuickbooksConnect} className="mt-6">
          <Button type="submit" variant={qbReady ? "default" : "outline"}>
            {qbReady ? copy.qbConnectReady : copy.qbConnectSoon}
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
