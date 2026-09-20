import { updateCompany } from "@/app/actions/settings";
import { LogoField } from "@/components/settings/file-fields";
import { ProBadge, SchemaWarning, SettingsBanner, SettingsToolbar } from "@/components/settings/settings-chrome";
import { OutlinedField, OutlinedSelect } from "@/components/ui/outlined-field";
import { appCopy } from "@/lib/i18n-request";
import { EMPLOYEE_COUNT_KEYS, INDUSTRY_KEYS } from "@/lib/onboarding";
import { isProPlan } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { STUDIO_COUNTRIES } from "@/lib/studio-settings";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const copy = dict.app.settingsPage;
  const { error, saved } = await searchParams;
  const loaded = await loadStudioSettings(user.id, { uploads: "logo" });
  const s = loaded.settings;
  const showPro = isProPlan(user);

  return (
    <form action={updateCompany}>
      <SettingsToolbar cancelLabel={copy.cancel} saveLabel={copy.save} />
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card grid gap-8 rounded-2xl p-6 md:p-8">
        <section>
          <h2 className="mb-4 font-display text-xl">
            {copy.company.logo}
            {showPro ? <ProBadge label={copy.pro} /> : null}
          </h2>
          <LogoField initialUrl={s.logoDataUrl} label="" removeLabel={copy.company.removeLogo} />
        </section>
        <section className="grid gap-5">
          <h2 className="font-display text-xl">{copy.company.basic}</h2>
          <OutlinedField label={copy.company.companyName} name="businessName" defaultValue={user.businessName} />
          <OutlinedField label={copy.company.phone} name="businessPhone" defaultValue={user.businessPhone || user.phone} />
          <OutlinedField label={copy.company.address1} name="addressLine1" defaultValue={s.addressLine1} />
          <OutlinedField label={copy.company.address2} name="addressLine2" defaultValue={s.addressLine2} />
          <div className="grid gap-5 md:grid-cols-2">
            <OutlinedField label={copy.company.city} name="city" defaultValue={s.city} />
            <OutlinedField label={copy.company.region} name="region" defaultValue={s.region} />
            <OutlinedSelect label={copy.company.country} name="country" defaultValue={s.country}>
              <option value=""></option>
              {STUDIO_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </OutlinedSelect>
            <OutlinedField label={copy.company.postal} name="postalCode" defaultValue={s.postalCode} />
          </div>
          <OutlinedField label={copy.company.taxNumber} name="taxNumber" defaultValue={s.taxNumber} />
        </section>
        <section className="grid gap-5">
          <h2 className="font-display text-xl">{copy.company.additional}</h2>
          <OutlinedField
            label={copy.company.companyEmail}
            name="businessEmail"
            type="email"
            defaultValue={user.businessEmail}
          />
          <OutlinedField label={copy.company.phone2} name="businessPhone2" defaultValue={s.businessPhone2} />
          <OutlinedField label={copy.company.fax} name="businessFax" defaultValue={s.businessFax} />
          <OutlinedField label={copy.company.website} name="website" defaultValue={user.website} />
          <OutlinedSelect
            label={copy.employeeCount}
            name="employeeCount"
            defaultValue={user.employeeCount ?? ""}
          >
            <option value="">{copy.employeeCount}</option>
            {EMPLOYEE_COUNT_KEYS.map((key) => (
              <option key={key} value={key}>
                {dict.onboarding.employees[key]}
              </option>
            ))}
          </OutlinedSelect>
          <OutlinedSelect
            label={copy.company.industry}
            name="industry"
            defaultValue={user.industry || s.industry}
          >
            <option value="">{copy.company.industryPlaceholder}</option>
            {INDUSTRY_KEYS.map((key) => (
              <option key={key} value={key}>
                {dict.onboarding.industries[key]}
              </option>
            ))}
          </OutlinedSelect>
        </section>
      </div>
    </form>
  );
}
