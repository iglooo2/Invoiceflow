import { FileText } from "lucide-react";
import { ContractDialog } from "@/components/settings/contract-dialog";
import { ProBadge, SchemaWarning, SettingsBanner } from "@/components/settings/settings-chrome";
import { appCopy } from "@/lib/i18n-request";
import { isProPlan } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { loadContracts } from "@/lib/studio-settings-store";

export default async function ContractsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireUser();
  const { dict } = await appCopy();
  const copy = dict.app.settingsPage;
  const { error, saved } = await searchParams;
  const loaded = await loadContracts(user.id);
  const showPro = isProPlan(user);
  const dialogCopy = {
    new: copy.contracts.new,
    edit: copy.contracts.edit,
    name: copy.contracts.name,
    details: copy.contracts.details,
    defaultEstimate: copy.contracts.defaultEstimate,
    defaultInvoice: copy.contracts.defaultInvoice,
    delete: copy.contracts.delete,
    cancel: copy.cancel,
    save: copy.save,
    triggerLabel: copy.contracts.new,
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ContractDialog trigger="new" copy={dialogCopy} />
      </div>
      <SchemaWarning message={loaded.warning} />
      <SettingsBanner error={error} saved={saved === "1"} savedLabel={copy.saved} />
      <div className="paper-card min-h-72 rounded-2xl p-6 md:p-8">
        <h2 className="inline-flex items-center font-display text-xl">
          {copy.contracts.heading}
          {showPro ? <ProBadge label={copy.pro} /> : null}
        </h2>
        {loaded.contracts.length === 0 ? (
          <p className="mt-16 text-center text-muted-foreground">{copy.contracts.empty}</p>
        ) : (
          <ul className="mt-6 divide-y divide-border">
            {loaded.contracts.map((contract) => (
              <li key={contract.id} className="flex items-start gap-3">
                <FileText className="mt-4 h-4 w-4 shrink-0 text-muted-foreground" />
                <ContractDialog trigger="row" contract={contract} copy={dialogCopy} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
