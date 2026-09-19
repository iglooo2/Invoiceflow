import { updateMarkup } from "@/app/actions/settings";
import { SchemaWarning, SettingsBanner, SettingsToolbar } from "@/components/settings/settings-chrome";
import { OutlinedField } from "@/components/ui/outlined-field";
import { appCopy } from "@/lib/i18n-request";
import { requireUser } from "@/lib/session";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export default async function MarkupSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const copy = dict.app.settingsPage;
  const { error, saved } = await searchParams;
  const loaded = await loadStudioSettings(user.id);

  return (
    <form action={updateMarkup}>
      <SettingsToolbar cancelLabel={copy.cancel} saveLabel={copy.save} />
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card grid gap-4 rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-xl">{copy.markup.heading}</h2>
        <p className="text-sm text-muted-foreground">{copy.markup.lede}</p>
        <OutlinedField
          label={copy.markup.percent}
          name="defaultMarkupPercent"
          type="number"
          defaultValue={loaded.settings.defaultMarkupPercent}
        />
      </div>
    </form>
  );
}
