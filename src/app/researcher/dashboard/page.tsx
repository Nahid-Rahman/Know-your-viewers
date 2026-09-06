import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/common/stat-tile";
import { StatusBadge } from "@/components/common/status-badge";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { FunnelSteps } from "@/components/charts/funnel-steps";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireRoleOrRedirect } from "@/lib/auth";
import {
  getExperiments,
  getFunnel,
  getDashboardSummary,
  getRecruitmentSourceBreakdown,
  getStreamerPerformance,
  getRecentActivity,
  RECRUITMENT_SOURCE_LABELS,
} from "@/lib/queries/research";

export const metadata = { title: "Researcher Dashboard | LiveDrop Arena" };

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function ResearcherDashboardPage() {
  const researcher = await requireRoleOrRedirect("RESEARCHER");
  const experiments = await getExperiments(researcher.id);
  const activeExperiment = experiments.find((e) => e.status === "ACTIVE");
  const funnel = activeExperiment ? await getFunnel(activeExperiment.id) : [];
  const disclosureByCondition = activeExperiment
    ? activeExperiment.conditions.map((c) => ({ name: c.name, disclosureRate: c.disclosureRate }))
    : [];

  const [summary, sources, streamerPerformance, recentActivity] = await Promise.all([
    getDashboardSummary(researcher.id),
    getRecruitmentSourceBreakdown(researcher.id),
    getStreamerPerformance(researcher.id),
    getRecentActivity(researcher.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Research Progress"
        description="How participants move through the study, where they come from, and where the follow-up pipeline stands."
        actions={
          <Link href="/researcher/experiments/new" className={cn(buttonVariants(), "bg-gradient-primary text-white hover:opacity-90")}>
            New Experiment
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatTile label="Total Participants" value={summary.totalParticipants.toLocaleString()} />
        <StatTile label="Study Started" value={summary.studyStarted.toLocaleString()} />
        <StatTile label="Study Completed" value={summary.studyCompleted.toLocaleString()} tone="cyan" />
        <StatTile label="Completion Rate" value={`${summary.completionRate}%`} tone="cyan" />
        <StatTile label="Dropped" value={summary.dropped.toLocaleString()} />
        <StatTile label="Contacts Submitted" value={summary.contactsSubmitted.toLocaleString()} />
        <StatTile label="Debrief Pending" value={summary.debriefPending.toLocaleString()} />
        <StatTile label="Debrief Completed" value={summary.debriefCompleted.toLocaleString()} tone="green" />
        <StatTile label="Data Use Approved" value={summary.dataUseApproved.toLocaleString()} tone="green" />
        <StatTile label="Interview Accepted" value={summary.interviewAccepted.toLocaleString()} tone="violet" />
        <StatTile label="Interview Completed" value={summary.interviewCompleted.toLocaleString()} tone="violet" />
        <StatTile label="Eligible for Analysis" value={summary.eligibleForAnalysis.toLocaleString()} tone="green" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <FunnelSteps
          title="Participation funnel"
          description={activeExperiment ? activeExperiment.title : "No active experiment"}
          stages={funnel}
        />
        <BarChartCard
          title="Contact disclosure rate by condition"
          description={activeExperiment?.title}
          data={disclosureByCondition}
          dataKey="disclosureRate"
          categoryKey="name"
          horizontal
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p className="font-semibold">Recruitment source performance</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Which entry point converts best</p>
          </div>
          {sources.length === 0 ? (
            <EmptyState title="No recruitment activity yet" description="Source breakdown appears once participants start arriving." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.source}>
                    <TableCell className="font-medium">{RECRUITMENT_SOURCE_LABELS[s.source]}</TableCell>
                    <TableCell className="text-right">{s.visits}</TableCell>
                    <TableCell className="text-right">{s.studyStarts}</TableCell>
                    <TableCell className="text-right">{s.completions}</TableCell>
                    <TableCell className="text-right">{s.completionRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p className="font-semibold">Streamer performance</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Recruitment/source analysis, not a performance review</p>
          </div>
          {streamerPerformance.length === 0 ? (
            <EmptyState title="No streamers assigned yet" description="Assign a streamer to an experiment to see recruitment data here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Streamer</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Participants</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Interviews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streamerPerformance.map((s) => (
                  <TableRow key={s.streamerId}>
                    <TableCell className="font-medium">{s.displayName}</TableCell>
                    <TableCell className="text-right">{s.streamSessions}</TableCell>
                    <TableCell className="text-right">{s.participants}</TableCell>
                    <TableCell className="text-right">{s.completed}</TableCell>
                    <TableCell className="text-right">{s.completionRate}%</TableCell>
                    <TableCell className="text-right">{s.interviewAccepted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="font-semibold">Experiments</p>
            <Link href="/researcher/experiments" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {experiments.map((exp) => (
              <Link
                key={exp.id}
                href={`/researcher/experiments/${exp.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-secondary/30"
              >
                <div>
                  <p className="font-medium">{exp.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {exp.participantCount} participants &bull; {exp.completionRate}% completion
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={exp.status} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p className="font-semibold">Recent activity</p>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState title="Nothing yet" description="Activity from participants and the follow-up pipeline will show up here." />
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div>
                    <p>{item.label}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.anonymousCode}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
