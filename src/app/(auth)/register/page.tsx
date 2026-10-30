import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Accounts | LiveDrop Arena" };

// Public self-registration was removed: it let anyone pick the Researcher
// role and reach participant contact data. Accounts are now created by the
// research team (scripts/create-account.mts / Streamers screen).
export default function RegisterPage() {
  return (
    <div className="text-center">
      <h1 className="font-display text-2xl font-bold">Accounts are created by the research team</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        There is no public sign-up. If you are a collaborating researcher or streamer, ask the study administrator for an
        account. Viewers taking part in the study never need an account.
      </p>
      <Link href="/login" className={`${buttonVariants({ variant: "outline" })} mt-6`}>
        Back to sign in
      </Link>
    </div>
  );
}
