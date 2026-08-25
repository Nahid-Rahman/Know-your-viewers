import { SiteNavbar } from "@/features/stimulus/components/site-navbar";
import { SiteFooter } from "@/features/stimulus/components/site-footer";

export default function StimulusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteNavbar />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
