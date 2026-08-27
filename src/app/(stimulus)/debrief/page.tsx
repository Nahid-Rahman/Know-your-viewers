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
import { getPublicSiteContent } from "@/lib/actions/site-content";
import { DEFAULT_SITE_CONTENT, type DebriefContent } from "@/lib/site-content-defaults";

export default function DebriefPage() {
  const router = useRouter();
  const [answered, setAnswered] = useState<"granted" | "declined" | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [content, setContent] = useState<DebriefContent>(DEFAULT_SITE_CONTENT.debriefContent);

  useEffect(() => {
    void logEngagementEvent("PAGE_VIEW");
    void getPublicSiteContent().then((c) => {
      if (c) setContent(c.debriefContent);
    });
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
        {content.heroLabel}
      </EyebrowLabel>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{content.title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{content.introParagraph}</p>

      <GlowCard className="mt-8" glow="violet">
        <div className="mb-3 flex items-center gap-2">
          <Info className="size-4 text-accent-violet" />
          <p className="font-bold">{content.simulatedElementsTitle}</p>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {content.simulatedElements.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-accent-violet">&bull;</span>
              {item}
            </li>
          ))}
        </ul>
      </GlowCard>

      <GlowCard className="mt-4">
        <p className="mb-2 font-bold">{content.dataUsageTitle}</p>
        <p className="text-sm text-muted-foreground">{content.dataUsageParagraph}</p>
      </GlowCard>

      <GlowCard className="mt-4 border-primary/25 bg-primary/5">
        <div className="mb-2 flex items-center gap-2">
          <ShieldAlert className="size-4 text-primary" />
          <p className="font-bold">{content.choiceTitle}</p>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">{content.choiceParagraph}</p>

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
            {content.grantedMessage}
          </p>
        ) : (
          <p className="rounded-lg border border-accent-cyan/25 bg-accent-cyan/10 p-3 text-sm text-accent-cyan">
            {content.declinedMessage}
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
        {content.footerContactText}{" "}
        <Link href="/support" className="underline underline-offset-2">
          Support page &rarr;
        </Link>
      </p>
    </div>
  );
}
