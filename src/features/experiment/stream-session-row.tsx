"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { StreamSessionDialog } from "@/features/experiment/stream-session-dialog";
import { deleteStreamSession } from "@/lib/actions/stream-sessions";
import type { StreamSessionRow as StreamSessionRowData } from "@/lib/queries/research";

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
      <TableCell>{session.streamStartLabel}</TableCell>
      <TableCell>{session.estimatedViewerCountLabel}</TableCell>
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
