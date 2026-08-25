import Link from "next/link";
import { Users, FlaskConical, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusBadge } from "@/components/common/status-badge";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireRoleOrRedirect } from "@/lib/auth";
import { getExperiments, getFunnel } from "@/lib/queries/research";

export const metadata = { title: "Researcher Dashboard | LiveDrop Arena" };

export default async function ResearcherDashboardPage() {
  const researcher = await requireRoleOrRedirect("RESEARCHER");
  const experiments = await getExperiments(researcher.id);
  const activeExperiment = experiments.find((e) => e.status === "ACTIVE");
  const funnel = activeExperiment ? await getFunnel(activeExperiment.id) : [];
  const disclosureByCondition = activeExperiment
    ? activeExperiment.conditions.map((c) => ({ name: c.name, disclosureRate: c.disclosureRate }))
    : [];

  const activeExperiments = experiments.filter((e) => e.status === "ACTIVE");
  const totalParticipants = experiments.reduce((sum, e) => sum + e.participantCount, 0);
  const avgCompletion =
    experiments.filter((e) => e.participantCount > 0).reduce((s, e) => s + e.completionRate, 0) /
    Math.max(experiments.filter((e) => e.participantCount > 0).length, 1);

  return (
    <div>
      <PageHeader
        title="Research Progress"
        description="Aggregate view across all experiments. Individual participant records are never shown here."
        actions={
          <Link href="/researcher/experiments/new" className={cn(buttonVariants(), "bg-gradient-primary text-white hover:opacity-90")}>
            New Experiment
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Experiments" value={activeExperiments.length} icon={<FlaskConical className="size-4" />} tone="violet" />
        <StatCard label="Total Participants" value={totalParticipants.toLocaleString()} icon={<Users className="size-4" />} tone="cyan" />
        <StatCard label="Avg. Completion Rate" value={`${avgCompletion.toFixed(0)}%`} icon={<TrendingUp className="size-4" />} tone="green" />
        <StatCard label="Ethics-Approved Studies" value={experiments.filter((e) => e.ethicsApprovalRef).length} icon={<ShieldCheck className="size-4" />} tone="primary" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title="Contact disclosure rate by condition"
          description="Persuasion Cues in Viewer Reward Recruitment"
          data={disclosureByCondition}
          dataKey="disclosureRate"
          categoryKey="name"
          horizontal
        />
        <LineChartCard
          title="Participation funnel"
          description="From landing to granted research permission"
          data={funnel.map((f) => ({ stage: f.stage, count: f.count }))}
          dataKey="count"
          categoryKey="stage"
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card">
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
    </div>
  );
}
