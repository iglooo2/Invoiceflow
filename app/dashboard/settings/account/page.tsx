import { updateAccount } from "@/app/actions/account";
import { SettingsBanner, SettingsToolbar, SchemaWarning } from "@/components/settings/settings-chrome";
import { OutlinedField, OutlinedSelect } from "@/components/ui/outlined-field";
import { appCopy } from "@/lib/i18n-request";
import { requireUser } from "@/lib/session";
import { loadAccountSettings } from "@/lib/studio-settings-store";
import { STUDIO_CURRENCIES, STUDIO_LOCALES, splitPersonName } from "@/lib/studio-settings";

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const copy = dict.app.settingsPage;
  const { error, saved } = await searchParams;
  const loaded = await loadAccountSettings(user.id);
  const split = splitPersonName(user.name);
  const firstName = loaded.settings.firstName || split.firstName;
  const lastName = loaded.settings.lastName || split.lastName;

  return (
    <form action={updateAccount}>
      <SettingsToolbar cancelLabel={copy.cancel} saveLabel={copy.save} />
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card grid gap-8 rounded-2xl p-6 md:p-8">
        <section className="grid gap-5">
          <h2 className="font-display text-xl">{copy.account.heading}</h2>
          <OutlinedField label={copy.account.firstName} name="firstName" defaultValue={firstName} autoComplete="given-name" />
          <OutlinedField label={copy.account.lastName} name="lastName" defaultValue={lastName} autoComplete="family-name" />
          <OutlinedField
            label={copy.account.email}
            name="email"
            type="email"
            defaultValue={user.email}
            autoComplete="email"
          />
        </section>
        <section className="grid gap-5">
          <h2 className="font-display text-xl">{copy.account.passwordHeading}</h2>
          <OutlinedField
            label={copy.account.password}
            name="password"
            type="password"
            autoComplete="new-password"
          />
          <OutlinedField
            label={copy.account.confirmPassword}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">{copy.account.passwordHint}</p>
          <OutlinedSelect label={copy.account.currency} name="defaultCurrency" defaultValue={loaded.settings.defaultCurrency}>
            {STUDIO_CURRENCIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </OutlinedSelect>
          <OutlinedSelect label={copy.account.locale} name="documentLocale" defaultValue={loaded.settings.documentLocale}>
            {STUDIO_LOCALES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </OutlinedSelect>
          <p className="text-xs text-muted-foreground">{copy.account.localeHint}</p>
        </section>
      </div>
    </form>
  );
}
