import { appCopy } from "@/lib/i18n-request";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { dict } = await appCopy();
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <SettingsNav labels={dict.app.settingsPage.nav} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
