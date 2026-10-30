import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getSiteContent } from "@/lib/queries/research";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SiteContentForm } from "@/features/researcher/site-content-form";
import { AboutContentForm } from "@/features/researcher/about-content-form";
import { SupportContentForm } from "@/features/researcher/support-content-form";
import { TermsContentForm } from "@/features/researcher/terms-content-form";
import { DebriefContentForm } from "@/features/researcher/debrief-content-form";
import { EntryReceivedContentForm } from "@/features/researcher/entry-received-content-form";
import { NavBrandContentForm } from "@/features/researcher/nav-brand-content-form";

export const metadata = { title: "Stimulus Content | LiveDrop Arena" };

export default async function SiteContentSettingsPage() {
  await requireRoleOrRedirect("RESEARCHER");
  const content = (await getSiteContent()) ?? DEFAULT_SITE_CONTENT;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/researcher/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to settings
      </Link>
      <PageHeader
        title="Stimulus Content"
        description="Site-wide text for the About, Support, Terms pages and the navigation/footer."
      />

      <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm">
        The homepage, reward wheel and entry confirmation are now configured <strong>per stream session</strong> (Campaigns → Sessions →
        a session → Homepage &amp; wheel configuration). The Landing, Debrief and Entry Confirmation tabs below only affect legacy
        (pre-revision) pages. Review the Brand &amp; Navigation labels (e.g. &quot;Spin &amp; Win&quot;, &quot;Try Your Luck&quot;) and the
        footer disclaimer against the approved study wording.
      </p>

      <Tabs defaultValue="landing">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="landing">Landing (legacy)</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="debrief">Debrief (legacy)</TabsTrigger>
          <TabsTrigger value="entry">Entry Confirmation (legacy)</TabsTrigger>
          <TabsTrigger value="brand">Brand &amp; Navigation</TabsTrigger>
        </TabsList>

        <TabsContent value="landing">
          <SiteContentForm content={content} />
        </TabsContent>
        <TabsContent value="about">
          <AboutContentForm content={content.aboutContent} />
        </TabsContent>
        <TabsContent value="support">
          <SupportContentForm content={content.supportContent} />
        </TabsContent>
        <TabsContent value="terms">
          <TermsContentForm content={content.termsContent} />
        </TabsContent>
        <TabsContent value="debrief">
          <DebriefContentForm content={content.debriefContent} />
        </TabsContent>
        <TabsContent value="entry">
          <EntryReceivedContentForm content={content.entryReceivedContent} />
        </TabsContent>
        <TabsContent value="brand">
          <NavBrandContentForm
            content={{
              siteName: content.siteName,
              siteDescription: content.siteDescription,
              navContent: content.navContent,
              footerContent: content.footerContent,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
