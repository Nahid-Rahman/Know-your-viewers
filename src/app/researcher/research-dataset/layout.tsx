import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getResearchDatasetSummary } from "@/lib/queries/research";
import { ResearchDatasetTabs } from "@/features/research-dataset/research-dataset-tabs";

export default async function ResearchDatasetLayout({
  children,
}: LayoutProps<"/researcher/research-dataset">) {
  await requireRoleOrRedirect("RESEARCHER");
  const summary = await getResearchDatasetSummary();

  return (
    <div>
      <PageHeader
        title="Research Dataset"
        description="Export or browse data for analysis outside the platform. Phone numbers only ever appear in the restricted contact export."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Participants" value={summary.totalParticipants.toLocaleString("en-US")} />
        <StatTile label="Events" value={summary.totalEvents.toLocaleString("en-US")} />
        <StatTile label="Survey Responses" value={summary.totalResponses.toLocaleString("en-US")} />
        <StatTile label="Contacts on File" value={summary.contactsOnFile.toLocaleString("en-US")} />
        <StatTile label="Interviews Completed" value={summary.interviewsCompleted.toLocaleString("en-US")} tone="violet" />
        <StatTile label="Excluded" value={summary.excludedCount.toLocaleString("en-US")} />
      </div>

      <ResearchDatasetTabs />
      {children}
    </div>
  );
}
