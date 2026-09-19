import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { updateStudio } from "@/app/actions/settings";
import { appCopy } from "@/lib/i18n-request";

export default async function SettingsPage() {
  const user = await requireUser();
  const { dict } = await appCopy();
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">{dict.app.settingsPage.title}</h1>
      <p className="mt-2 text-muted-foreground">{dict.app.settingsPage.lede}</p>
      <form action={updateStudio} className="mt-6 grid gap-4">
        <Field label={dict.app.settingsPage.yourName} name="name" defaultValue={user.name} />
        <Field label={dict.app.settingsPage.studioName} name="businessName" defaultValue={user.businessName} />
        <Field label={dict.app.settingsPage.studioEmail} name="businessEmail" defaultValue={user.businessEmail} />
        <Field label={dict.app.settingsPage.phone} name="businessPhone" defaultValue={user.businessPhone} />
        <Field label={dict.app.settingsPage.website} name="website" defaultValue={user.website} />
        <div className="grid gap-2">
          <Label htmlFor="businessAddress">{dict.app.settingsPage.address}</Label>
          <Textarea id="businessAddress" name="businessAddress" defaultValue={user.businessAddress ?? ""} />
        </div>
        <Button type="submit">{dict.app.save}</Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
