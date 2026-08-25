import Link from "next/link";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { StatTile } from "@/components/common/stat-tile";
import { StepCard } from "@/components/common/step-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, Zap, Mail } from "lucide-react";

const REQUIRED_FIELDS = [
  "Email or phone number",
  "Stream nickname",
  "Favourite game type",
  "Livestream watching frequency",
  "Reward result",
  "Response code",
];

const NEVER_COLLECTED = ["Passwords", "OTP Codes", "Payment Info", "Game Login", "National ID", "Full Address"];

export const metadata = { title: "About the Event | LiveDrop Arena" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <EyebrowLabel glyph="◆" className="mb-5">
            ABOUT THE EVENT
          </EyebrowLabel>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            Viewer Rewards,
            <br />
            <span className="text-primary">Made Simple.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            LiveDrop Arena is a livestream viewer reward event interface where participants can
            spin for a viewer drop and submit one contact method for follow-up verification.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
            <span className="text-green">&#9679; EVENT LIVE</span>
            <span className="text-blue">&#9679; FREE TO JOIN</span>
            <span className="text-purple">&#9679; NO ACCOUNT NEEDED</span>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div
            className="flex h-40 w-40 items-center justify-center rounded-full text-6xl"
            style={{ backgroundImage: "linear-gradient(to bottom right, var(--primary), var(--primary-dark))" }}
          >
            🏆
          </div>
        </div>
      </div>

      <section className="mt-16">
        <EyebrowLabel glyph="◆" className="mb-4">
          WHAT IS LIVEDROP ARENA?
        </EyebrowLabel>
        <div className="card-border flex items-start gap-4 rounded-xl p-5">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-display font-bold">What is LiveDrop Arena?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              LiveDrop Arena is designed for livestream audiences who want to join a short viewer
              reward event. The experience is simple: explore the event, spin the reward roll,
              and submit basic follow-up details.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <EyebrowLabel glyph="◆" className="mb-4">
          HOW IT WORKS
        </EyebrowLabel>
        <h2 className="mb-8 font-display text-2xl font-bold sm:text-3xl">How the event works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard step={1} accent="cyan" icon={<Eye className="size-5" />} title="Choose a Reward Pool"
            description="Open the reward event and review the featured drop categories before you roll." />
          <StepCard step={2} accent="violet" icon={<Zap className="size-5" />} title="Spin the Reward Roll"
            description="Hit SPIN and watch the carousel land on your viewer reward result." />
          <StepCard step={3} accent="green" icon={<Mail className="size-5" />} title="Submit for Follow-up"
            description="Provide your email or phone so the admin team can contact you after verification." />
        </div>
      </section>

      <section className="mt-16">
        <EyebrowLabel glyph="◆" className="mb-4">
          INFORMATION REQUIRED
        </EyebrowLabel>
        <div className="card-border grid gap-6 rounded-xl p-5 md:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xl">✉</span>
              <p className="font-display font-bold">Only basic follow-up details</p>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              We only collect the minimum information needed to process your reward drop and
              follow up with you.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {REQUIRED_FIELDS.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <span className="text-green">✓</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 md:flex-col">
            <StatTile value="6" label="Fields Total" tone="cyan" className="flex-1" />
            <StatTile value="0" label="Sensitive Data" tone="green" className="flex-1" />
          </div>
        </div>
      </section>

      <section className="mt-16 rounded-xl border border-green/25 bg-green/5 p-8">
        <EyebrowLabel variant="green" glyph="◆" className="mb-4">
          SAFETY &amp; TRUST
        </EyebrowLabel>
        <div className="flex items-start gap-4">
          <span className="text-2xl">🛡</span>
          <div>
            <p className="font-display font-bold">Your account details are never required</p>
            <p className="mt-1 text-sm text-muted-foreground">
              LiveDrop Arena does not require passwords, OTPs, payment details, game account
              login, national ID, full address, or account connection permissions.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NEVER_COLLECTED.map((item) => (
            <div key={item} className="flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              <span aria-hidden>&#8856;</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-14 flex flex-wrap justify-center gap-4">
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "bg-gradient-primary text-white hover:opacity-90")}>
          &larr; Back to Event
        </Link>
        <Link href="/support" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          Contact Support
        </Link>
      </div>
    </div>
  );
}
