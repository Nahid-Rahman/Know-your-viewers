import Link from "next/link";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { CodeBlock } from "@/components/common/code-block";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INFO_WE_USE = [
  { icon: "✉", label: "Email or phone number" },
  { icon: "☆", label: "Stream nickname" },
  { icon: "⚡", label: "Favourite game type" },
  { icon: "◎", label: "Livestream watching frequency" },
  { icon: "✓", label: "Reward result" },
  { icon: "◯", label: "Response code" },
  { icon: "☆", label: "Campaign / session identifiers" },
];

const NEVER_COLLECT = [
  "Password",
  "OTP",
  "Payment card or wallet PIN",
  "Game account login",
  "National ID",
  "Full address",
  "Account connection or token access",
];

const TERMS_SUMMARY_ITEMS = [
  "One viewer entry can be submitted through the event form",
  "Reward results are saved for follow-up verification",
  "The team may contact the participant using the provided email or phone number",
  "Final reward processing may depend on campaign rules and verification",
];

export const metadata = { title: "Terms & Privacy | LiveDrop Arena" };

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <EyebrowLabel glyph={null} className="mb-4">
            TERMS &amp; PRIVACY
          </EyebrowLabel>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            Clear rules.
            <br />
            <span className="text-primary">Safe participation.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            This page explains what information is used for viewer drop follow-up and what
            information is never required.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
            <span className="text-green">🔒 NO PAYMENT REQUIRED</span>
            <span className="text-blue">◯ NO LOGIN NEEDED</span>
            <span className="text-purple">◎ TRANSPARENT POLICY</span>
          </div>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center justify-self-end rounded-xl border border-primary/30 bg-primary/10 text-2xl">
          🛡
        </div>
      </div>

      <div id="privacy" className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="card-border rounded-xl p-6">
          <p className="mb-3 text-xs font-semibold text-blue">SECTION 01</p>
          <h2 className="mb-3 text-lg font-bold">Event Terms Summary</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            LiveDrop Arena is a viewer reward event interface. Reward availability may vary by
            campaign, reward pool, and verification status. Submitting an entry does not require
            payment or account login.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {TERMS_SUMMARY_ITEMS.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">&rsaquo;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="card-border rounded-xl p-6">
          <p className="mb-3 text-xs font-semibold text-blue">SECTION 02</p>
          <h2 className="mb-3 text-lg font-bold">Information We Use</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Only basic follow-up information is used to contact the participant and verify the
            viewer entry.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INFO_WE_USE.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className="text-blue">{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-destructive/25 bg-destructive/5 p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <p className="mb-4 text-xs font-semibold text-primary">SAFETY NOTICE</p>
            <h2 className="mb-3 text-xl font-bold">
              We never ask for <span className="text-primary">sensitive account details</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              LiveDrop Arena does not require passwords, OTPs, payment card information, wallet
              PINs, game account login, national ID, full address, or account connection
              permissions.
            </p>
          </div>
          <div className="min-w-64">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">WE WILL NEVER COLLECT:</p>
            <div className="grid grid-cols-2 gap-2">
              {NEVER_COLLECT.map((item) => (
                <div key={item} className="flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/10 px-2.5 py-2 text-[11px] font-medium text-destructive">
                  <span aria-hidden>&#8856;</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card-border rounded-xl p-6">
          <p className="mb-3 text-xs font-semibold text-green">SECTION 04</p>
          <h2 className="mb-3 text-lg font-bold">Follow-up Contact</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            After entry submission, our team may contact the participant regarding the next
            process after verification. Participants should use their response code when asking
            about their entry.
          </p>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">SAMPLE RESPONSE CODE</p>
          <CodeBlock label="" value="LDA-8K42" className="border-0 bg-transparent p-0" />
        </div>

        <div className="card-border flex flex-col justify-between rounded-xl p-6">
          <div>
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple/10 text-lg text-purple">
              🔒
            </span>
            <h2 className="mb-2 text-lg font-bold">Ready to participate?</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Head back to the event to submit your viewer entry or reach out if you need help.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/" className={cn(buttonVariants(), "bg-gradient-primary text-white hover:opacity-90")}>
              &larr; Back to Event
            </Link>
            <Link href="/support" className={cn(buttonVariants({ variant: "outline" }))}>
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
