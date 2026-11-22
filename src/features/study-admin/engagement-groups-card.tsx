import Link from "next/link";
import type { attemptOutcomes, durationGroups } from "@/lib/study/stats";

const GROUP_LABELS: Record<string, string> = {
  NEVER_REACHED_REWARD: "Never reached the reward section",
  REACHED_REWARD_NO_SUCCESSFUL_SUBMISSION: "Reached reward section, no saved entry",
  SUCCESSFULLY_SUBMITTED: "Entry saved",
};
const ROUTE_LABELS: Record<string, string> = { home: "Homepage", about: "About", terms: "Terms", support: "Support", confirmation: "Confirmation" };
const STAGE_LABELS: Record<string, string> = {
  SUBMISSION_ATTEMPTED: "Submit pressed (valid or not)",
  SUBMISSION_VALIDATION_FAILED: "Failed form checks in the browser",
  SUBMISSION_REJECTED: "Rejected by the server",
  SUBMISSION_SAVED: "Saved by the server",
};

const secs = (x: number | null) => (x === null ? "—" : x < 90 ? `${Math.round(x)} s` : `${(x / 60).toFixed(1)} min`);
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);

const PHASE_LINKS: [string, string, string | null][] = [
  ["ALL", "All visits", null],
  ["LIVE", "Started during the stream", "live"],
  ["POST_STREAM", "Started after the stream", "post"],
  ["PRE_STREAM", "Before the stream", "pre"],
  ["UNKNOWN", "Phase unknown", "unknown"],
];

export function EngagementGroupsCard({
  groups,
  attempts,
  scopeLabel,
  query = {},
}: {
  groups: Awaited<ReturnType<typeof durationGroups>>;
  attempts?: Awaited<ReturnType<typeof attemptOutcomes>>;
  scopeLabel: string;
  /** Other search params to keep on the phase links. */
  query?: Record<string, string>;
}) {
  const href = (p: string | null) => {
    const q = new URLSearchParams(query);
    if (p) q.set("phase", p);
    const s = q.toString();
    return s ? `?${s}` : "?";
  };
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-1 font-display text-lg font-bold">Engagement by furthest stage — {scopeLabel}</h2>
      <nav aria-label="Stream phase" className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {PHASE_LINKS.map(([key, label, p]) => {
          const n = key === "ALL" ? null : groups.byPhase[key as keyof typeof groups.byPhase];
          const text = `${label}${n !== null ? ` (${n})` : ""}`;
          return groups.phase === key ? (
            <span key={key} aria-current="true" className="font-semibold">
              {text}
            </span>
          ) : (
            <Link key={key} href={href(p)} scroll={false} className="text-primary underline">
              {text}
            </Link>
          );
        })}
      </nav>
      <p className="mb-3 text-xs text-muted-foreground">
        Per <strong>visit</strong> (not person). Each visit is in one group. Visible time is an estimate of time the public pages were on screen
        (heartbeat-credited); elapsed time runs from first to last signal. Neither measures attention or reading. Based on{" "}
        {groups.comparableVisits} visit(s) measured on all public pages
        {groups.phase !== "ALL" ? " that started in the selected phase (by recorded actual start/end)" : ""}
        {groups.legacyVisits > 0 ? `; ${groups.legacyVisits} older homepage-only visit(s) are left out so definitions aren't mixed` : ""}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-medium">Group</th>
              <th className="py-1 text-right font-medium">Visits</th>
              <th className="py-1 text-right font-medium">Share</th>
              <th className="py-1 text-right font-medium">Visible median</th>
              <th className="py-1 text-right font-medium">mean</th>
              <th className="py-1 text-right font-medium">p25–p75</th>
              <th className="py-1 text-right font-medium">p90</th>
              <th className="py-1 text-right font-medium">Homepage median</th>
              <th className="py-1 text-right font-medium">Elapsed median</th>
            </tr>
          </thead>
          <tbody>
            {groups.groups.map((g) => (
              <tr key={g.group} className="border-t border-border/60">
                <td className="py-1">{GROUP_LABELS[g.group]}</td>
                <td className="py-1 text-right">{g.visits}</td>
                <td className="py-1 text-right text-muted-foreground">{pct(g.share)}</td>
                <td className="py-1 text-right">{secs(g.visible.median)}</td>
                <td className="py-1 text-right">{secs(g.visible.mean)}</td>
                <td className="py-1 text-right text-muted-foreground">{g.visible.n ? `${secs(g.visible.p25)}–${secs(g.visible.p75)}` : "—"}</td>
                <td className="py-1 text-right text-muted-foreground">{secs(g.visible.p90)}</td>
                <td className="py-1 text-right">{secs(g.homeVisible.median)}</td>
                <td className="py-1 text-right">{secs(g.elapsed.median)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Visible time by page (visits with any time there):{" "}
        {Object.entries(groups.routes)
          .map(([k, r]) => `${ROUTE_LABELS[k]} ${r.visitsWithTime} visit(s), median ${secs(r.visible.median)}`)
          .join(" · ")}
      </p>

      {attempts && (
        <>
      <h3 className="mt-4 mb-1 text-sm font-semibold">Submit attempts</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Since 2026-11-22 every press of Submit is counted, including ones that fail the form checks. Earlier data counted only valid
        submits. Reason codes only; typed values are never recorded.
      </p>
      <ul className="space-y-0.5 text-sm">
        {attempts.stages.map((s) => (
          <li key={s.type}>
            {STAGE_LABELS[s.type]}: {s.events} time(s) in {s.visits} visit(s)
          </li>
        ))}
      </ul>
      {attempts.validationReasons.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Form-check reasons (attempts can have several): {attempts.validationReasons.map((r) => `${r.reason.toLowerCase().replace(/_/g, " ")} ${r.attempts}`).join(" · ")}
        </p>
      )}
        </>
      )}
    </section>
  );
}
