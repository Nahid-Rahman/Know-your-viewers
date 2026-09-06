"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";
import { CopyableCode } from "@/components/common/copyable-code";
import { ConfirmDeleteButton } from "@/components/common/confirm-delete-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteTrackingLink, updateTrackingLink, type TrackingLinkInput } from "@/lib/actions/tracking-links";
import { RECRUITMENT_SOURCE_LABELS, type EntrySourceValue } from "@/lib/entry-source";

export function TrackingLinkRow({
  link,
  streamers,
  streamSessions,
}: {
  link: {
    id: string;
    uniqueCode: string;
    streamerId: string | null;
    streamSessionId: string | null;
    entrySource: EntrySourceValue;
    visits: number;
    conversions: number;
  };
  streamers: { id: string; displayName: string }[];
  streamSessions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const rate = link.visits > 0 ? ((link.conversions / link.visits) * 100).toFixed(1) : "0.0";

  const streamerLabels = new Map(streamers.map((s) => [s.id, s.displayName]));
  const streamSessionLabels = new Map(streamSessions.map((s) => [s.id, s.label]));

  async function handleUpdate(patch: TrackingLinkInput) {
    setSaving(true);
    const result = await updateTrackingLink(link.id, patch);
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <TableRow className={cn(saving && "opacity-60 transition-opacity")}>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <CopyableCode value={link.uniqueCode} />
          {saving && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={link.streamerId ?? "none"}
          onValueChange={(value) => handleUpdate({ streamerId: value === "none" ? null : value })}
          disabled={saving}
        >
          <SelectTrigger className="w-40">
            <SelectValue>{(value: string) => (value === "none" ? "Unassigned" : (streamerLabels.get(value) ?? value))}</SelectValue>
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
      <TableCell>
        <Select
          value={link.entrySource}
          onValueChange={(value) =>
            handleUpdate({ entrySource: (value ?? "OTHER") as EntrySourceValue, streamSessionId: link.streamSessionId })
          }
          disabled={saving}
        >
          <SelectTrigger className="w-40">
            <SelectValue>{(value: EntrySourceValue) => RECRUITMENT_SOURCE_LABELS[value] ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RECRUITMENT_SOURCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={link.streamSessionId ?? "none"}
          onValueChange={(value) =>
            handleUpdate({ streamSessionId: value === "none" ? null : value, entrySource: link.entrySource })
          }
          disabled={saving}
        >
          <SelectTrigger className="w-44">
            <SelectValue>{(value: string) => (value === "none" ? "None" : (streamSessionLabels.get(value) ?? value))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {streamSessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>{link.visits.toLocaleString("en-US")}</TableCell>
      <TableCell>{link.conversions.toLocaleString("en-US")}</TableCell>
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
