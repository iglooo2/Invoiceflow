import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createClient, deleteClient } from "@/app/actions/clients";
import { appCopy } from "@/lib/i18n-request";

export default async function ClientsPage() {
  const user = await requireUser();
  const { dict } = await appCopy();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="font-display text-4xl">{dict.app.clients}</h1>
        <p className="mt-2 text-muted-foreground">{dict.app.clientsPage.lede}</p>
        <form action={createClient} className="mt-6 grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="name">{dict.app.clientsPage.name}</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{dict.app.clientsPage.email}</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">{dict.app.clientsPage.company}</Label>
            <Input id="company" name="company" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">{dict.app.clientsPage.address}</Label>
            <Textarea id="address" name="address" />
          </div>
          <Button type="submit">{dict.app.clientsPage.save}</Button>
        </form>
      </div>
      <div className="grid gap-3">
        {clients.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            {dict.app.clientsPage.empty}
          </p>
        ) : null}
        {clients.map((client) => (
          <div key={client.id} className="flex items-start justify-between rounded-3xl border border-border bg-card p-4">
            <div>
              <p className="font-medium">{client.name}</p>
              <p className="text-sm text-muted-foreground">{client.company}</p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
            <form action={deleteClient.bind(null, client.id)}>
              <Button type="submit" variant="ghost" size="sm">
                {dict.app.remove}
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
