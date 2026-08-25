"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TableCell, TableRow } from "@/components/ui/table";
import { CopyableCode } from "@/components/common/copyable-code";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteTrackingLink, updateTrackingLinkStreamer } from "@/lib/actions/tracking-links";

export function TrackingLinkRow({
  link,
  streamers,
}: {
  link: { id: string; uniqueCode: string; streamerId: string | null; visits: number; conversions: number };
  streamers: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const rate = link.visits > 0 ? ((link.conversions / link.visits) * 100).toFixed(1) : "0.0";

  async function handleReassign(value: string) {
    setSaving(true);
    const result = await updateTrackingLinkStreamer(link.id, value === "none" ? null : value);
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell>
        <CopyableCode value={link.uniqueCode} />
      </TableCell>
      <TableCell>
        <Select
          value={link.streamerId ?? "none"}
          onValueChange={(value) => handleReassign(value ?? "none")}
          disabled={saving}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {streamers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>{link.visits.toLocaleString()}</TableCell>
      <TableCell>{link.conversions.toLocaleString()}</TableCell>
      <TableCell>{rate}%</TableCell>
      <TableCell>
        <ConfirmDeleteButton
          confirmDescription={`Delete tracking link "${link.uniqueCode}"? Participants already attributed to it keep their data — only the link itself is removed.`}
          onConfirm={() => deleteTrackingLink(link.id)}
        />
      </TableCell>
    </TableRow>
  );
}
