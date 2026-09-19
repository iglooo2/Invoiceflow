import { ReferralPanel } from "@/components/settings/referral-panel";
import { SchemaWarning, SettingsBanner } from "@/components/settings/settings-chrome";
import { appCopy } from "@/lib/i18n-request";
import { localizedPath } from "@/lib/i18n";
import { canonicalReferralUrl, REFERRAL_QUALIFYING_DAYS, REFERRAL_REWARD_USD } from "@/lib/referrals";
import { requireUser } from "@/lib/session";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export default async function ReferSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const { locale, dict } = await appCopy();
  const copy = dict.app.settingsPage;
  const { error, saved } = await searchParams;
  const loaded = await loadStudioSettings(user.id);
  const code = loaded.settings.referralCode.trim();

  return (
    <div>
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <ReferralPanel
        reward={REFERRAL_REWARD_USD}
        days={REFERRAL_QUALIFYING_DAYS}
        referralUrl={code ? canonicalReferralUrl(code) : null}
        copy={{
          headline: copy.refer.headline,
          lede: copy.refer.lede,
          generate: copy.refer.generate,
          termsLead: copy.refer.termsLead,
          termsLink: copy.refer.termsLink,
          termsTail: copy.refer.termsTail,
          agree: copy.refer.agree,
          share: copy.refer.share,
          copyLink: copy.refer.copy,
          copied: copy.refer.copied,
          linkLabel: copy.refer.linkLabel,
          earnings: copy.refer.earnings,
          earningsHint: copy.refer.earningsHint,
          earningsPlaceholder: copy.refer.earningsPlaceholder,
          generated: copy.refer.generated,
          termsHref: localizedPath(locale, "/referral-terms"),
          phoneMore: copy.refer.phoneMore,
          phoneTitle: copy.refer.phoneTitle,
          phoneStatus: copy.refer.phoneStatus,
        }}
      />
    </div>
  );
}
