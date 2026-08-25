import { notFound } from "next/navigation";
import { ShieldCheck, Info } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { CopyableCode } from "@/components/common/copyable-code";
import { getExperimentById, mockTrackingLinks } from "@/lib/mock/research";

const CURRENT_STREAMER_ID = "str_1";

export default async function StreamerStudyDetailPage({
  params,
}: PageProps<"/streamer/studies/[id]">) {
  const { id } = await params;
  const experiment = getExperimentById(id);
  if (!experiment || !experiment.assignedStreamerIds.includes(CURRENT_STREAMER_ID)) notFound();

  const link = mockTrackingLinks.find((l) => l.experimentId === id && l.streamerId === CURRENT_STREAMER_ID);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold sm:text-3xl">{experiment.title}</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{experiment.description}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Your Link Visits" value={link?.visits.toLocaleString() ?? "0"} tone="cyan" />
        <StatCard label="Your Link Conversions" value={link?.conversions.toLocaleString() ?? "0"} tone="green" />
      </div>

      {link && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <p className="mb-2 font-semibold">Your tracking link code</p>
          <CopyableCode value={link.uniqueCode} />
          <p className="mt-2 text-xs text-muted-foreground">
            Share this code with the research team&apos;s link format so visits from your channel are
            attributed to this study.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-accent-violet/25 bg-accent-violet/5 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Info className="size-4 text-accent-violet" />
          <p className="font-semibold">Study Instructions</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Share the study link with your audience exactly as provided by the research team. Do not
          modify the reward claims, countdown, or badges shown on the page — the wording is part of
          the approved research protocol.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-accent-green" />
        Ethics reference on file: {experiment.ethicsApprovalRef ?? "pending"}
      </div>
    </div>
  );
}
