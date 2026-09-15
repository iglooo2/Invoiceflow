import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-lg place-content-center px-4 text-center">
      <h1 className="font-display text-4xl">That document isn’t here.</h1>
      <p className="mt-3 text-muted-foreground">The link may be wrong, or the invoice was deleted.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to InvoiceFlow Studio</Link>
      </Button>
    </div>
  );
}
