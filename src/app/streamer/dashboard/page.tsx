import Link from "next/link";
import { Link2, ListVideo, MousePointerClick } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/common/stat-card";
import { CopyableCode } from "@/components/common/copyable-code";
import { mockExperiments, mockTrackingLinks } from "@/lib/mock/research";

const CURRENT_STREAMER_ID = "str_1";

export const metadata = { title: "Streamer Dashboard | LiveDrop Arena" };

export default function StreamerDashboardPage() {
  const assigned = mockExperiments.filter((e) => e.assignedStreamerIds.includes(CURRENT_STREAMER_ID));
  const myLinks = mockTrackingLinks.filter((l) => l.streamerId === CURRENT_STREAMER_ID);
  const totalClicks = myLinks.reduce((s, l) => s + l.visits, 0);

  return (
    <div>
      <PageHeader title="Your Studies" description="Studies you've been assigned to as a research streamer partner." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned Studies" value={assigned.length} icon={<ListVideo className="size-4" />} tone="cyan" />
        <StatCard label="Your Link Clicks" value={totalClicks.toLocaleString()} icon={<MousePointerClick className="size-4" />} tone="violet" />
        <StatCard label="Active Tracking Links" value={myLinks.length} icon={<Link2 className="size-4" />} tone="green" />
      </div>

      <div className="mt-6 space-y-3">
        {assigned.map((exp) => {
          const link = myLinks.find((l) => l.experimentId === exp.id);
          return (
            <div key={exp.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/streamer/studies/${exp.id}`} className="font-semibold hover:text-primary">
                    {exp.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{exp.objective}</p>
                </div>
                {link && <CopyableCode value={link.uniqueCode} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
