import { Shield, FileBadge } from "lucide-react";
import { updateLinks } from "@/app/actions/settings";
import { DocumentDrop } from "@/components/settings/file-fields";
import { ProBadge, SchemaWarning, SettingsBanner, SettingsToolbar } from "@/components/settings/settings-chrome";
import { Input } from "@/components/ui/input";
import { appCopy } from "@/lib/i18n-request";
import { isProPlan } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export default async function LinksSettingsPage({
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
    <form action={updateLinks}>
      <SettingsToolbar cancelLabel={copy.cancel} saveLabel={copy.save} />
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card grid gap-8 rounded-2xl p-6 md:p-8">
        <section className="grid gap-5">
          <h2 className="font-display text-xl text-primary">
            {copy.links.licenseHeading}
            {showPro ? <ProBadge label={copy.pro} /> : null}
          </h2>
          <DocumentDrop
            name="licenseFile"
            label={copy.links.license}
            buttonLabel={copy.links.selectLicense}
            fileName={s.licenseFileName}
            clearName="clearLicense"
            icon={<FileBadge className="h-4 w-4" />}
          />
          <DocumentDrop
            name="insuranceFile"
            label={copy.links.insurance}
            buttonLabel={copy.links.selectInsurance}
            fileName={s.insuranceFileName}
            clearName="clearInsurance"
            icon={<Shield className="h-4 w-4" />}
          />
        </section>
        <section className="grid gap-4">
          <h2 className="font-display text-xl text-primary">
            {copy.links.webHeading}
            {showPro ? <ProBadge label={copy.pro} /> : null}
          </h2>
          <Input name="website" placeholder={copy.links.website} defaultValue={user.website ?? ""} />
          <Input name="facebookUrl" placeholder={copy.links.facebook} defaultValue={s.facebookUrl} />
          <Input name="googleBusinessUrl" placeholder={copy.links.google} defaultValue={s.googleBusinessUrl} />
          <Input name="instagramUrl" placeholder={copy.links.instagram} defaultValue={s.instagramUrl} />
          <Input name="yelpUrl" placeholder={copy.links.yelp} defaultValue={s.yelpUrl} />
        </section>
      </div>
    </form>
  );
}
