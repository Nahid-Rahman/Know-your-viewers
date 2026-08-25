import { notFound } from "next/navigation";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { getExperimentById, mockFunnel } from "@/lib/mock/research";

export default async function AnalyticsPage({
  params,
}: PageProps<"/researcher/experiments/[id]/analytics">) {
  const { id } = await params;
  const experiment = getExperimentById(id);
  if (!experiment) notFound();

  const disclosureData = experiment.conditions.map((c) => ({
    name: c.name,
    disclosureRate: c.disclosureRate,
  }));

  const trustDistribution = [
    { label: "Not at all", count: 62 },
    { label: "Slightly", count: 118 },
    { label: "Moderately", count: 244 },
    { label: "Mostly", count: 271 },
    { label: "Completely", count: 117 },
  ];

  return (
    <div className="space-y-6">
      <p className="rounded-lg border border-accent-cyan/25 bg-accent-cyan/10 p-3 text-xs text-accent-cyan">
        All figures below are aggregated across participants. No individual response is shown.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Disclosure rate by condition"
          description="% of participants who submitted contact details"
          data={disclosureData}
          dataKey="disclosureRate"
          categoryKey="name"
          horizontal
        />
        <LineChartCard
          title="Participation funnel"
          data={mockFunnel.map((f) => ({ stage: f.stage, count: f.count }))}
          dataKey="count"
          categoryKey="stage"
        />
      </div>

      <DistributionChart
        title="Pre-debrief trust in event legitimacy"
        description="Self-reported, collected in the post-study survey"
        data={trustDistribution}
      />
    </div>
  );
}
