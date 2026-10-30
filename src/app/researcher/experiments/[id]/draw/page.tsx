import Link from "next/link";
import { requireExperimentPage, researcherScope } from "@/lib/study/researcher";
import { drawPreflight } from "@/lib/study/draw";
import { getDraws } from "@/lib/study/admin-queries";
import { formatStudyTime } from "@/lib/study/time";
import { StatusBadge } from "@/components/common/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayoutForm, RunDrawForm } from "@/features/study-admin/draw-forms";
import { ActionButton } from "@/features/study-admin/action-button";
import { voidDrawAction } from "@/lib/actions/study-admin";
import { AGE_GROUP_LABELS } from "@/lib/study/constants";

export const dynamic = "force-dynamic";

export default async function DrawPage({ params }: PageProps<"/researcher/experiments/[id]/draw">) {
  const { id } = await params;
  const user = await requireExperimentPage(id);
  const { scope } = await researcherScope("contact");
  const canRun = scope.includes(id);
  const [live, test, draws] = await Promise.all([drawPreflight(user, id, false), drawPreflight(user, id, true), getDraws(id)]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="font-semibold">How the draw works</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li>The wheel result is display only — it is never treated as winning the draw.</li>
          <li>Only canonical (first-per-phone) entries are eligible; duplicates can&apos;t add chances. Draw-excluded entries are left out.</li>
          <li>Research permission, interview participation and optional fields have no effect on eligibility.</li>
          <li>Winners are chosen on the server with a cryptographic RNG, without replacement, after entries close. The eligible snapshot is stored.</li>
          <li>The winner count is never reduced automatically, and a finalized draw can&apos;t be rerun — only voided with a recorded reason.</li>
        </ul>
      </div>

      {[
        { label: "Live draw", isTest: false, pre: live },
        { label: "Test draw (synthetic TEST-session entries only)", isTest: true, pre: test },
      ].map(({ label, isTest, pre }) => (
        <section key={label} className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">{label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Eligible canonical entries: {pre.eligibleCount}
            {pre.under18Eligible === null ? " (under-18 handling not decided)" : pre.under18Eligible ? " (under-18 included)" : " (under-18 excluded)"}
          </p>
          {pre.problems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-300">
              {pre.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {canRun && (
            <div className="mt-3">
              <RunDrawForm experimentId={id} isTest={isTest} liveWinnerCount={pre.winnerCount} eligibleCount={pre.eligibleCount} blocked={pre.problems.length > 0} />
            </div>
          )}
        </section>
      ))}

      {draws.map((d) => (
        <section key={d.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">
                {d.isTest ? "Test draw" : "Live draw"} · {formatStudyTime(d.executedAt)}
              </h2>
              <p className="text-xs text-muted-foreground">
                By {d.executedBy.name}. {d.requestedWinnerCount} winners from {d.eligibleCount} eligible. {d.method}
              </p>
              {d.voidReason && <p className="text-xs text-destructive">Voided {formatStudyTime(d.voidedAt)}: {d.voidReason}</p>}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={d.status} />
              {canRun && d.status === "FINALIZED" && (
                <ActionButton action={voidDrawAction.bind(null, d.id)} label="Void" variant="destructive" confirmTitle="Void this draw?" reasonLabel="Reason (required, recorded)" reasonRequired />
              )}
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead><TableHead>Response code</TableHead><TableHead>Age group</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Payout</TableHead><TableHead>Paid at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.winners.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.rank}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/researcher/submissions/${w.submission.id}`} className="hover:underline">{w.submission.responseCode}</Link>
                    </TableCell>
                    <TableCell className="text-xs">{AGE_GROUP_LABELS[w.submission.ageGroup]}</TableCell>
                    <TableCell className="text-xs">BDT {w.amountBdt}</TableCell>
                    <TableCell>
                      {canRun && d.status === "FINALIZED" ? (
                        <PayoutForm winnerId={w.id} status={w.payoutStatus} paymentRef={w.paymentRef} />
                      ) : (
                        <StatusBadge status={w.payoutStatus} />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatStudyTime(w.paidAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}
