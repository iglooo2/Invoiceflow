import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { updateStudio } from "@/app/actions/settings";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl">Studio details</h1>
      <p className="mt-2 text-muted-foreground">This is what clients see on invoices, proposals, and PDFs.</p>
      <form action={updateStudio} className="mt-6 grid gap-4">
        <Field label="Your name" name="name" defaultValue={user.name} />
        <Field label="Studio name" name="businessName" defaultValue={user.businessName} />
        <Field label="Studio email" name="businessEmail" defaultValue={user.businessEmail} />
        <Field label="Phone" name="businessPhone" defaultValue={user.businessPhone} />
        <Field label="Website" name="website" defaultValue={user.website} />
        <div className="grid gap-2">
          <Label htmlFor="businessAddress">Address</Label>
          <Textarea id="businessAddress" name="businessAddress" defaultValue={user.businessAddress ?? ""} />
        </div>
        <Button type="submit">Save</Button>
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
