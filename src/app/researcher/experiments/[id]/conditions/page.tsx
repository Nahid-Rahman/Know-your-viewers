import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { RarityBadge } from "@/components/common/rarity-badge";
import { EmptyState } from "@/components/common/empty-state";
import { getExperimentById } from "@/lib/mock/research";

function Toggle({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <CheckCircle2 className="size-4 text-accent-green" />
  ) : (
    <XCircle className="size-4 text-muted-foreground/40" />
  );
}

export default async function ConditionsPage({
  params,
}: PageProps<"/researcher/experiments/[id]/conditions">) {
  const { id } = await params;
  const experiment = getExperimentById(id);
  if (!experiment) notFound();

  if (experiment.conditions.length === 0) {
    return (
      <EmptyState
        title="No conditions configured"
        description="Conditions let you randomly assign participants to variants that toggle urgency, social proof, and authority cues, so you can measure which one actually drives disclosure."
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Participants are randomly assigned to one condition on tracking-link resolution. Each
        condition toggles a distinct set of persuasion elements in the stimulus.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {experiment.conditions.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{c.name}</p>
              <RarityBadge rarity={c.rewardRarity} />
            </div>
            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Urgency (countdown)</span>
                <Toggle enabled={c.urgencyEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Social proof</span>
                <Toggle enabled={c.socialProofEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Authority badges</span>
                <Toggle enabled={c.authorityBadgesEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contact requirement</span>
                <span className="font-medium capitalize">{c.contactRequirement}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-center">
              <div>
                <p className="font-display text-xl font-bold">{c.participantCount}</p>
                <p className="text-[11px] text-muted-foreground uppercase">Participants</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-primary">{c.disclosureRate}%</p>
                <p className="text-[11px] text-muted-foreground uppercase">Disclosure rate</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
