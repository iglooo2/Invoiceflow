import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createClient, deleteClient } from "@/app/actions/clients";

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="font-display text-4xl">Clients</h1>
        <p className="mt-2 text-muted-foreground">Save the people you invoice so the next one takes thirty seconds.</p>
        <form action={createClient} className="mt-6 grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" />
          </div>
          <Button type="submit">Save client</Button>
        </form>
      </div>
      <div className="grid gap-3">
        {clients.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No saved clients yet. The demo account includes Hearth Goods and Oak & Film.
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
                Remove
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
