import { EyebrowLabel } from "@/components/common/eyebrow-label";
import { RichHeadline } from "@/components/common/rich-headline";
import { SupportForm } from "@/features/stimulus/components/support-form";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";

export async function generateMetadata() {
  const content = await getSiteContent();
  const support = content?.supportContent ?? DEFAULT_SITE_CONTENT.supportContent;
  const siteName = content?.siteName ?? DEFAULT_SITE_CONTENT.siteName;
  return { title: `${support.pageTitle} | ${siteName}` };
}

export default async function SupportPage() {
  const content = (await getSiteContent()) ?? DEFAULT_SITE_CONTENT;
  const support = content.supportContent;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-12 md:grid-cols-2 md:items-start">
        <div>
          <EyebrowLabel className="mb-4">{support.heroEyebrow}</EyebrowLabel>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            <RichHeadline text={support.heroTitle} />
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{support.heroSubtext}</p>

          <div className="mt-8 space-y-4">
            {support.infoCards.map((card) => (
              <div key={card.title} className="card-border flex items-start gap-3 rounded-xl p-4">
                <span className="text-xl">{card.icon}</span>
                <div>
                  <p className="font-display font-bold">{card.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-border rounded-xl p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-2xl">✉</span>
            <div>
              <p className="font-display text-lg font-bold">Support Request</p>
              <p className="text-xs font-semibold text-primary">{content.siteName.toUpperCase()}</p>
            </div>
          </div>
          <SupportForm />
          <p className="mt-4 text-center text-xs text-muted-foreground">{support.formFooterText}</p>
        </div>
      </div>

      <p className="mt-16 text-center text-xs font-semibold text-green">{support.bottomTrustText}</p>
    </div>
  );
}
