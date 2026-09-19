import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { updateDocuments } from "@/app/actions/settings";
import { ProBadge, SchemaWarning, SettingsBanner, SettingsToolbar } from "@/components/settings/settings-chrome";
import { ToggleSwitch } from "@/components/settings/toggle-switch";
import { OutlinedField } from "@/components/ui/outlined-field";
import { Textarea } from "@/components/ui/input";
import { appCopy } from "@/lib/i18n-request";
import { isProPlan } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { paymentTermsLabel } from "@/lib/studio-settings";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export default async function DocumentsSettingsPage({
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
    <form action={updateDocuments}>
      <SettingsToolbar cancelLabel={copy.cancel} saveLabel={copy.save} />
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card grid gap-8 rounded-2xl p-6 md:p-8">
        <section>
          <h2 className="font-display text-xl text-primary">
            {copy.documents.heading}
            {showPro ? <ProBadge label={copy.pro} /> : null}
          </h2>
          <div className="mt-4 flex items-center justify-between gap-4 border-b border-border pb-4">
            <span className="inline-flex items-center gap-2 text-sm">
              {copy.documents.sections}
              <CircleHelp className="h-4 w-4 text-muted-foreground" />
            </span>
            <ToggleSwitch name="organizeLineItemSections" defaultChecked={s.organizeLineItemSections} />
          </div>
        </section>
        <section className="grid gap-3">
          <h2 className="font-display text-xl">{copy.documents.payments}</h2>
          <div className="flex items-center gap-3">
            <OutlinedField
              label={copy.documents.terms}
              name="paymentTermsDays"
              type="number"
              defaultValue={s.paymentTermsDays}
              className="flex-1"
            />
            <span className="shrink-0 text-sm text-muted-foreground">{paymentTermsLabel(s.paymentTermsDays)}</span>
          </div>
        </section>
        <section className="grid gap-3">
          <h2 className="font-display text-xl">{copy.documents.footer}</h2>
          <Textarea
            name="footerMessage"
            defaultValue={s.footerMessage}
            placeholder={copy.documents.footerPlaceholder}
            rows={5}
          />
        </section>
        <section>
          <h2 className="font-display text-xl text-primary">{copy.documents.templates}</h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{copy.documents.templatesLede}</p>
            <Link href="/dashboard#templates" className="text-sm font-medium text-accent">
              {copy.documents.manage}
            </Link>
          </div>
        </section>
      </div>
    </form>
  );
}
