import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { githubAuthEnabled, isDevMode, resendEnabled } from "@/lib/utils";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/shell";
import { AuthForms } from "./auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  return (
    <div>
      <MarketingHeader signedIn={false} />
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="font-display text-4xl">Get back to the work. We’ll handle the PDF.</h1>
          <p className="mt-4 text-muted-foreground">
            Email and password work with zero API keys. Add GitHub or Resend when you’re ready for production
            auth.
          </p>
        </div>
        <AuthForms
          githubEnabled={githubAuthEnabled()}
          magicEnabled={resendEnabled()}
          showDemoCredentials={isDevMode()}
          callbackUrl={params.callbackUrl || "/dashboard"}
          initialMode={params.mode === "register" ? "register" : "signin"}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
