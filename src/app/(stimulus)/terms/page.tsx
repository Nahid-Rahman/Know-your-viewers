import Link from "next/link";
import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { RichHeadline } from "@/components/common/rich-headline";
import { CodeBlock } from "@/components/common/code-block";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";

export async function generateMetadata() {
  const content = await getSiteContent();
  const terms = content?.termsContent ?? DEFAULT_SITE_CONTENT.termsContent;
  const siteName = content?.siteName ?? DEFAULT_SITE_CONTENT.siteName;
  return { title: `${terms.pageTitle} | ${siteName}` };
}

export default async function TermsPage() {
  const content = (await getSiteContent()) ?? DEFAULT_SITE_CONTENT;
  const terms = content.termsContent;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <EyebrowLabel glyph={null} className="mb-4">
            {terms.heroEyebrow}
          </EyebrowLabel>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            <RichHeadline text={terms.heroTitle} />
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{terms.heroSubtext}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
            {terms.heroBadges.map((badge, i) => (
              <span key={badge} className={["text-green", "text-blue", "text-purple"][i % 3]}>
                {badge}
              </span>
            ))}
          </div>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center justify-self-end rounded-xl border border-primary/30 bg-primary/10 text-2xl">
          🛡
        </div>
      </div>

      <div id="privacy" className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="card-border rounded-xl p-6">
          <p className="mb-3 text-xs font-semibold text-blue">{terms.section1Eyebrow}</p>
          <h2 className="mb-3 text-lg font-bold">{terms.section1Title}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{terms.section1Description}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {terms.summaryItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">&rsaquo;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="card-border rounded-xl p-6">
          <p className="mb-3 text-xs font-semibold text-blue">{terms.section2Eyebrow}</p>
          <h2 className="mb-3 text-lg font-bold">{terms.section2Title}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{terms.section2Description}</p>
          <div className="grid grid-cols-2 gap-2">
            {terms.infoWeUse.map(({ icon, label }) => (
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
            <p className="mb-4 text-xs font-semibold text-primary">{terms.safetyNoticeEyebrow}</p>
            <h2 className="mb-3 text-xl font-bold">
              <RichHeadline text={terms.safetyNoticeTitle} />
            </h2>
            <p className="text-sm text-muted-foreground">{terms.safetyNoticeDescription}</p>
          </div>
          <div className="min-w-64">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">WE WILL NEVER COLLECT:</p>
            <div className="grid grid-cols-2 gap-2">
              {terms.neverCollect.map((item) => (
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
          <p className="mb-3 text-xs font-semibold text-green">{terms.section4Eyebrow}</p>
          <h2 className="mb-3 text-lg font-bold">{terms.section4Title}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{terms.section4Description}</p>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">SAMPLE RESPONSE CODE</p>
          <CodeBlock label="" value={terms.sampleResponseCode} className="border-0 bg-transparent p-0" />
        </div>

        <div className="card-border flex flex-col justify-between rounded-xl p-6">
          <div>
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple/10 text-lg text-purple">
              🔒
            </span>
            <h2 className="mb-2 text-lg font-bold">{terms.ctaTitle}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{terms.ctaDescription}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              prefetch={false}
              className={cn(buttonVariants(), "bg-gradient-primary text-white hover:opacity-90")}
            >
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
