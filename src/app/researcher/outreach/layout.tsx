import { PageHeader } from "@/components/layout/page-header";
import { OutreachTabs } from "@/features/outreach/outreach-tabs";
import { requireRoleOrRedirect } from "@/lib/auth";

export default async function OutreachLayout({ children }: LayoutProps<"/researcher/outreach">) {
  await requireRoleOrRedirect("RESEARCHER");

  return (
    <div>
      <PageHeader
        title="Outreach"
        description="Follow up on submitted contacts and run the debrief queue for participants who haven't completed it on their own."
      />
      <OutreachTabs />
      {children}
    </div>
  );
}
