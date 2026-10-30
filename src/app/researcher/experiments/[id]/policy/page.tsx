import { requireExperimentPage, researcherScope } from "@/lib/study/researcher";
import { getExperimentAccessList, getPolicies } from "@/lib/study/admin-queries";
import { POLICY_KEYS } from "@/lib/study/policy";
import { formatStudyTime } from "@/lib/study/time";
import { PolicyEditor } from "@/features/study-admin/policy-editor";
import { CollaboratorForm } from "@/features/study-admin/collaborator-form";
import { ActionButton } from "@/features/study-admin/action-button";
import { removeCollaboratorAction, retentionAction } from "@/lib/actions/study-admin";
import { retentionRun } from "@/lib/study/retention";

export const dynamic = "force-dynamic";

export default async function PolicyPage({ params }: PageProps<"/researcher/experiments/[id]/policy">) {
  const { id } = await params;
  const user = await requireExperimentPage(id);
  const { scope: writeScope } = await researcherScope("write");
  const { scope: contactScope } = await researcherScope("contact");
  const canWrite = writeScope.includes(id);
  const [policies, access] = await Promise.all([getPolicies(id), getExperimentAccessList(id)]);
  const retention = contactScope.includes(id) ? await retentionRun(user, id, { dryRun: true }) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
        These are supervisor/ethics decisions, recorded explicitly. Nothing here is decided by the software: a value only takes effect
        once it is recorded as <strong>approved</strong> with an approval reference or note, and every change is logged.
      </div>

      <div className="space-y-3">
        {POLICY_KEYS.map((key) => {
          const p = policies.find((x) => x.key === key);
          return (
            <PolicyEditor
              key={key}
              experimentId={id}
              canWrite={canWrite}
              row={{
                key,
                status: p?.status ?? "PENDING",
                value: (p?.value as Record<string, unknown> | null) ?? null,
                note: p?.note ?? "",
                approvalRef: p?.approvalRef ?? "",
                decidedBy: p?.decidedBy?.name ?? null,
                decidedAt: p?.decidedAt ? formatStudyTime(p.decidedAt) : null,
              }}
            />
          );
        })}
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 font-display text-lg font-bold">Access</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Streamer accounts never see participant contact details. Collaborators must already have a researcher account (created by the
          administrator with scripts/create-account.mts).
        </p>
        <ul className="mb-3 space-y-1 text-sm">
          <li>
            {access.owner.name} ({access.owner.email}) — owner
          </li>
          {access.collaborators.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              {c.user.name} ({c.user.email}) — {c.role === "VIEWER" ? "viewer" : "researcher"}
              {user.id === access.owner.id && (
                <ActionButton action={removeCollaboratorAction.bind(null, id, c.user.id)} label="Remove" confirmTitle="Remove access?" />
              )}
            </li>
          ))}
        </ul>
        {user.id === access.owner.id && <CollaboratorForm experimentId={id} />}
      </section>

      {retention && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 font-display text-lg font-bold">Data lifecycle (retention)</h2>
          {!retention.decided ? (
            <p className="text-sm text-muted-foreground">Retention periods are not approved yet, so nothing is scheduled for removal.</p>
          ) : (
            <>
              <p className="text-sm">Preview (dry run) using the approved periods:</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                <li>Phone numbers to remove: {retention.phonesToRemove} (held for unpaid winners: {retention.phonesHeldForUnpaidWinners})</li>
                <li>Submissions with optional fields to clear: {retention.optionalFieldRowsToClear}</li>
                <li>Website events to delete: {retention.eventsToDelete}</li>
                <li>Support requests to purge: {retention.supportRequestsToPurge}</li>
              </ul>
              {retention.undecided.length > 0 && <p className="mt-1 text-xs text-amber-300">Undecided (skipped): {retention.undecided.join(", ")}</p>}
              <div className="mt-3">
                <ActionButton
                  action={retentionAction.bind(null, id, false)}
                  label="Run retention clean-up"
                  variant="destructive"
                  confirmTitle="Remove the data listed above?"
                  confirmText="This cannot be undone in the database. Copies in earlier backups are not affected — handle backups per the retention decision."
                />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
