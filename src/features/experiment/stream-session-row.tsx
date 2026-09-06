"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { StreamSessionDialog } from "@/features/experiment/stream-session-dialog";
import { deleteStreamSession } from "@/lib/actions/stream-sessions";
import type { StreamSessionRow as StreamSessionRowData } from "@/lib/queries/research";

function fmt(iso: string | null) {
  if (!iso) return "—";
  // Fixed locale (not `undefined`) — this is a Client Component, so it renders once during
  // SSR and again during hydration; letting the runtime's default locale decide risks a
  // server/browser mismatch and a hydration error even though the visible result is correct.
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function StreamSessionRow({
  session,
  streamers,
}: {
  session: StreamSessionRowData;
  streamers: { id: string; displayName: string }[];
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{session.streamerName}</TableCell>
      <TableCell>{session.streamTitle ?? "—"}</TableCell>
      <TableCell>{session.gameName ?? "—"}</TableCell>
      <TableCell>{fmt(session.streamStartTime)}</TableCell>
      <TableCell>{session.estimatedViewerCount?.toLocaleString() ?? "—"}</TableCell>
      <TableCell>
        {session.qrDisplayed ? "QR" : ""}
        {session.qrDisplayed && session.chatLinkPosted ? " · " : ""}
        {session.chatLinkPosted ? "Chat" : ""}
        {!session.qrDisplayed && !session.chatLinkPosted ? "—" : ""}
      </TableCell>
      <TableCell>{session.trackingLinkCount}</TableCell>
      <TableCell>{session.participantCount}</TableCell>
      <TableCell className="flex items-center gap-1">
        <StreamSessionDialog
          streamers={streamers}
          session={session}
          triggerLabel="Edit"
          triggerVariant="outline"
        />
        <ConfirmDeleteButton
          confirmDescription={`Delete the stream session for "${session.streamTitle ?? session.streamerName}"? Tracking links must be reassigned or removed first.`}
          onConfirm={() => deleteStreamSession(session.id)}
        />
      </TableCell>
    </TableRow>
  );
}
