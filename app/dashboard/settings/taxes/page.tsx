import { deleteTax } from "@/app/actions/settings";
import { NewTaxDialog } from "@/components/settings/new-tax-dialog";
import { SchemaWarning, SettingsBanner } from "@/components/settings/settings-chrome";
import { Button } from "@/components/ui/button";
import { appCopy } from "@/lib/i18n-request";
import { requireUser } from "@/lib/session";
import { loadTaxRates } from "@/lib/studio-settings-store";

export default async function TaxesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const copy = dict.app.settingsPage;
  const { error, saved } = await searchParams;
  const loaded = await loadTaxRates(user.id);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <NewTaxDialog
          title={copy.taxes.new}
          nameLabel={copy.taxes.name}
          rateLabel={copy.taxes.rate}
          cancelLabel={copy.cancel}
          addLabel={copy.taxes.add}
          triggerLabel={copy.taxes.new}
        />
      </div>
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card min-h-72 rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-xl">{copy.taxes.heading}</h2>
        {loaded.taxes.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">{copy.taxes.empty}</p>
        ) : (
          <ul className="mt-6 divide-y divide-border">
            {loaded.taxes.map((tax) => (
              <li key={tax.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium">{tax.name}</p>
                  <p className="text-sm text-muted-foreground">{tax.rate}%</p>
                </div>
                <form action={deleteTax}>
                  <input type="hidden" name="taxId" value={tax.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    {copy.taxes.delete}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
