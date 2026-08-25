"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, Info, ArrowRight, ArrowLeft } from "lucide-react";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { GlowCard } from "@/components/common/glow-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getNextSurveyId, logEngagementEvent, submitDebrief } from "@/lib/actions/participant";

const SIMULATED_ELEMENTS = [
  "The countdown timer did not represent a real deadline.",
  "The \"247,000+ players\" and \"12.4K viewers\" figures were illustrative, not live counts.",
  "The reward roll outcome was not random for the purposes of this study.",
  "\"100% Official\" and similar authority badges described the study interface, not a real publisher programme.",
];

export default function DebriefPage() {
  const router = useRouter();
  const [answered, setAnswered] = useState<"granted" | "declined" | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    void logEngagementEvent("PAGE_VIEW");
  }, []);

  async function respond(choice: "granted" | "declined") {
    setAnswered(choice);
    const result = await submitDebrief(choice === "granted");
    if ("error" in result) toast.error(result.error);
  }

  async function continueToSurvey() {
    setNavigating(true);
    const surveyId = await getNextSurveyId();
    router.push(surveyId ? `/survey/${surveyId}` : "/");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <EyebrowLabel variant="violet" className="mb-4">
        Research Debrief
      </EyebrowLabel>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">
        Thank you &mdash; here is what this study was actually about.
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        You just took part in an academic research study on trust and disclosure behaviour in
        livestream gaming recruitment. Some details were withheld until now because revealing them
        earlier would have changed how you responded &mdash; the standard practice for this kind of
        research, always disclosed afterward.
      </p>

      <GlowCard className="mt-8" glow="violet">
        <div className="mb-3 flex items-center gap-2">
          <Info className="size-4 text-accent-violet" />
          <p className="font-bold">What was simulated on the previous pages</p>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {SIMULATED_ELEMENTS.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent-violet">&bull;</span>
              {item}
            </li>
          ))}
        </ul>
      </GlowCard>

      <GlowCard className="mt-4">
        <p className="mb-2 font-bold">What we will do with your information</p>
        <p className="text-sm text-muted-foreground">
          Your response code links your session data (which screens you saw, whether you spun,
          whether you submitted contact details) for analysis in aggregate only. If you provided
          an email or phone number, it is encrypted and stored separately from your behavioural
          data, and is used only to contact you if you asked a support question &mdash; never for
          marketing.
        </p>
      </GlowCard>

      <GlowCard className="mt-4 border-primary/25 bg-primary/5">
        <div className="mb-2 flex items-center gap-2">
          <ShieldAlert className="size-4 text-primary" />
          <p className="font-bold">Your choice now</p>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          You can choose whether the data from this session is used in the study. This will not
          affect any reward follow-up you were told about.
        </p>

        {answered === null ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-11 flex-1 bg-gradient-primary text-white hover:opacity-90"
              onClick={() => respond("granted")}
            >
              Yes, use my session data
            </Button>
            <Button variant="outline" className="h-11 flex-1" onClick={() => respond("declined")}>
              No, delete my data
            </Button>
          </div>
        ) : answered === "granted" ? (
          <p className="rounded-lg border border-accent-green/25 bg-accent-green/10 p-3 text-sm text-accent-green">
            Thank you. Your session data will be included in the study, in aggregate with other
            participants&apos; data.
          </p>
        ) : (
          <p className="rounded-lg border border-accent-cyan/25 bg-accent-cyan/10 p-3 text-sm text-accent-cyan">
            Understood. Any contact details you submitted have been queued for deletion, and your
            behavioural data will be excluded from analysis.
          </p>
        )}
      </GlowCard>

      {answered && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-11 flex-1 bg-gradient-primary text-white hover:opacity-90"
            disabled={navigating}
            onClick={continueToSurvey}
          >
            Continue to a short optional survey
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "default" }), "h-11 flex-1")}>
            <ArrowLeft data-icon="inline-start" />
            Finish without survey
          </Link>
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Questions about this study? Contact the research team via the{" "}
        <Link href="/support" className="underline underline-offset-2">
          support page
        </Link>
        , quoting your response code.
      </p>
    </div>
  );
}
