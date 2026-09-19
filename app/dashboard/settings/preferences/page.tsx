import { updatePreferences } from "@/app/actions/settings";
import { ProBadge, SchemaWarning, SettingsBanner, SettingsToolbar } from "@/components/settings/settings-chrome";
import { ToggleSwitch } from "@/components/settings/toggle-switch";
import { OutlinedTextarea } from "@/components/ui/outlined-field";
import { appCopy } from "@/lib/i18n-request";
import { isProPlan } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export default async function PreferencesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const copy = dict.app.settingsPage;
  const { error, saved } = await searchParams;
  const loaded = await loadStudioSettings(user.id);
  const s = loaded.settings;
  const showPro = isProPlan(user);

  return (
    <form action={updatePreferences}>
      <SettingsToolbar cancelLabel={copy.cancel} saveLabel={copy.save} />
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card grid gap-8 rounded-2xl p-6 md:p-8">
        <section className="grid gap-3">
          <h2 className="font-display text-xl">{copy.preferences.estimateHeading}</h2>
          <OutlinedTextarea
            label={copy.preferences.estimate}
            name="emailEstimateMessage"
            defaultValue={s.emailEstimateMessage}
            rows={4}
          />
        </section>
        <section className="grid gap-3">
          <h2 className="font-display text-xl">{copy.preferences.invoiceHeading}</h2>
          <OutlinedTextarea
            label={copy.preferences.invoice}
            name="emailInvoiceMessage"
            defaultValue={s.emailInvoiceMessage}
            rows={4}
          />
        </section>
        <section>
          <h2 className="font-display text-xl">
            {copy.preferences.notifications}
            {showPro ? <ProBadge label={copy.pro} /> : null}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.preferences.notificationsLede}</p>
          <div className="mt-4 divide-y divide-border">
            <ToggleSwitch
              name="notifyClientOpensEmail"
              label={copy.preferences.opens}
              defaultChecked={s.notifyClientOpensEmail}
            />
            <ToggleSwitch
              name="notifyEmailNotDelivered"
              label={copy.preferences.undelivered}
              defaultChecked={s.notifyEmailNotDelivered}
            />
            <ToggleSwitch
              name="notifyClientSigns"
              label={copy.preferences.signs}
              defaultChecked={s.notifyClientSigns}
            />
            <ToggleSwitch
              name="notifyClientViews"
              label={copy.preferences.views}
              defaultChecked={s.notifyClientViews}
            />
          </div>
        </section>
      </div>
    </form>
  );
}
