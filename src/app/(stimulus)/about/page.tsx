import Link from "next/link";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { RichHeadline } from "@/components/common/rich-headline";
import { StatTile } from "@/components/common/stat-tile";
import { StepCard } from "@/components/common/step-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, Zap, Mail } from "lucide-react";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";

const STEP_ICONS = [
  { accent: "cyan" as const, icon: <Eye className="size-5" /> },
  { accent: "violet" as const, icon: <Zap className="size-5" /> },
  { accent: "green" as const, icon: <Mail className="size-5" /> },
];

export async function generateMetadata() {
  const content = await getSiteContent();
  const about = content?.aboutContent ?? DEFAULT_SITE_CONTENT.aboutContent;
  const siteName = content?.siteName ?? DEFAULT_SITE_CONTENT.siteName;
  return { title: `${about.pageTitle} | ${siteName}` };
}

export default async function AboutPage() {
  const content = (await getSiteContent()) ?? DEFAULT_SITE_CONTENT;
  const about = content.aboutContent;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          <EyebrowLabel glyph="◆" className="mb-5">
            {about.heroEyebrow}
          </EyebrowLabel>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            <RichHeadline text={about.heroTitle} />
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{about.heroSubtext}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
            {about.liveBadges.map((badge, i) => (
              <span key={badge} className={["text-green", "text-blue", "text-purple"][i % 3]}>
                &#9679; {badge}
              </span>
            ))}
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
          {about.whatIsEyebrow}
        </EyebrowLabel>
        <div className="card-border flex items-start gap-4 rounded-xl p-5">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-display font-bold">{about.whatIsTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{about.whatIsDescription}</p>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <EyebrowLabel glyph="◆" className="mb-4">
          {about.howItWorksEyebrow}
        </EyebrowLabel>
        <h2 className="mb-8 font-display text-2xl font-bold sm:text-3xl">{about.howItWorksTitle}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {about.steps.map((step, i) => (
            <StepCard
              key={step.title}
              step={i + 1}
              accent={STEP_ICONS[i % 3].accent}
              icon={STEP_ICONS[i % 3].icon}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <EyebrowLabel glyph="◆" className="mb-4">
          {about.infoRequiredEyebrow}
        </EyebrowLabel>
        <div className="card-border grid gap-6 rounded-xl p-5 md:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xl">✉</span>
              <p className="font-display font-bold">{about.infoRequiredTitle}</p>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{about.infoRequiredDescription}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {about.requiredFields.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <span className="text-green">✓</span>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 md:flex-col">
            <StatTile value={about.statFieldsTotalValue} label={about.statFieldsTotalLabel} tone="cyan" className="flex-1" />
            <StatTile value={about.statSensitiveDataValue} label={about.statSensitiveDataLabel} tone="green" className="flex-1" />
          </div>
        </div>
      </section>

      <section className="mt-16 rounded-xl border border-green/25 bg-green/5 p-8">
        <EyebrowLabel variant="green" glyph="◆" className="mb-4">
          {about.safetyEyebrow}
        </EyebrowLabel>
        <div className="flex items-start gap-4">
          <span className="text-2xl">🛡</span>
          <div>
            <p className="font-display font-bold">{about.safetyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{about.safetyDescription}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {about.neverCollected.map((item) => (
            <div key={item} className="flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              <span aria-hidden>&#8856;</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-14 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          prefetch={false}
          className={cn(buttonVariants({ size: "lg" }), "bg-gradient-primary text-white hover:opacity-90")}
        >
          &larr; Back to Event
        </Link>
        <Link href="/support" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          Contact Support
        </Link>
      </div>
    </div>
  );
}
