"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { ConditionFormDialog } from "@/features/experiment/condition-form-dialog";
import { deleteCondition } from "@/lib/actions/conditions";

function Toggle({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <CheckCircle2 className="size-4 text-accent-green" />
  ) : (
    <XCircle className="size-4 text-muted-foreground/40" />
  );
}

export type ConditionRow = {
  id: string;
  name: string;
  urgencyEnabled: boolean;
  socialProofEnabled: boolean;
  authorityBadgesEnabled: boolean;
  rewardRarity: Rarity;
  contactRequirement: "optional" | "required";
  participantCount: number;
  disclosureRate: number;
};

export function ConditionsManager({ experimentId, conditions }: { experimentId: string; conditions: ConditionRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Participants are randomly assigned to one condition on tracking-link resolution. Each
          condition toggles a distinct set of persuasion elements in the stimulus.
        </p>
        <ConditionFormDialog experimentId={experimentId} trigger={<Button size="sm">New Condition</Button>} />
      </div>

      {conditions.length === 0 ? (
        <EmptyState
          title="No conditions configured"
          description="Conditions let you randomly assign participants to variants that toggle urgency, social proof, and authority cues, so you can measure which one actually drives disclosure."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {conditions.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{c.name}</p>
                <div className="flex items-center gap-2">
                  <RarityBadge rarity={c.rewardRarity} />
                  <ConditionFormDialog
                    experimentId={experimentId}
                    condition={{
                      id: c.id,
                      name: c.name,
                      urgencyEnabled: c.urgencyEnabled,
                      socialProofEnabled: c.socialProofEnabled,
                      authorityBadgesEnabled: c.authorityBadgesEnabled,
                      rewardRarity: c.rewardRarity.toUpperCase() as "COMMON" | "RARE" | "EXCEPTIONAL" | "PREMIUM",
                      contactRequirement: c.contactRequirement.toUpperCase() as "OPTIONAL" | "REQUIRED",
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <span className="text-xs">Edit</span>
                      </Button>
                    }
                  />
                  <ConfirmDeleteButton
                    confirmDescription={`Delete "${c.name}"? Only possible if no participants have been assigned to it yet.`}
                    onConfirm={() => deleteCondition(c.id)}
                  />
                </div>
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
      )}
    </div>
  );
}
