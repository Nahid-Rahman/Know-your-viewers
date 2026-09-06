"use client";

import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { InterviewDialog } from "@/features/outreach/interview-dialog";
import type { InterviewQueueRow } from "@/lib/queries/research";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US");
}

export function InterviewRow({ row }: { row: InterviewQueueRow }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        <Link href={`/researcher/participants/${row.participantId}`} className="hover:underline">
          {row.anonymousCode}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.streamerName ?? "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.invited ? fmtDate(row.invitedAt) : "Not invited"}</TableCell>
      <TableCell><StatusBadge status={row.consent} /></TableCell>
      <TableCell><StatusBadge status={row.status} /></TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.latestInterview ? (
          <div>
            <StatusBadge status={row.latestInterview.status} />
            <div className="mt-1">
              {row.latestInterview.interviewMode ? row.latestInterview.interviewMode.replaceAll("_", " ").toLowerCase() : "—"}
              {row.latestInterview.scheduledAt && ` · ${fmtDate(row.latestInterview.scheduledAt)}`}
            </div>
          </div>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell><StatusBadge status={row.eligible ? "ELIGIBLE" : "EXCLUDED"} /></TableCell>
      <TableCell>
        <InterviewDialog row={row} />
      </TableCell>
    </TableRow>
  );
}
