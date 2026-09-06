"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotesDialog } from "@/features/outreach/notes-dialog";
import { updateDebriefWorkflow } from "@/lib/actions/debrief";
import type { DebriefQueueRow } from "@/lib/queries/research";
import type { DebriefStatus, DebriefMethod } from "@/generated/prisma/enums";

function humanize(value: string) {
  return value.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const DEBRIEF_STATUSES: DebriefStatus[] = ["PENDING", "CONTACTED", "EXPLAINED", "ACKNOWLEDGED", "DECLINED", "UNREACHABLE"];
const DEBRIEF_METHODS: DebriefMethod[] = ["PHONE_CALL", "WHATSAPP", "SMS", "OTHER"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US");
}

export function DebriefRow({ row }: { row: DebriefQueueRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function run(action: Promise<{ error: string } | { ok: true }>) {
    setSaving(true);
    const result = await action;
    setSaving(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        <Link href={`/researcher/participants/${row.participantId}`} className="hover:underline">
          {row.anonymousCode}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.streamerName ?? "—"}</TableCell>
      <TableCell><StatusBadge status={row.contactStatus} /></TableCell>
      <TableCell className="text-sm text-muted-foreground">{fmtDate(row.contactSubmittedAt)}</TableCell>
      <TableCell>
        <Select
          value={row.debriefStatus}
          disabled={saving}
          onValueChange={(v) => run(updateDebriefWorkflow(row.participantId, { debriefStatus: (v ?? "PENDING") as DebriefStatus }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{(value: DebriefStatus) => humanize(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DEBRIEF_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={row.debriefMethod ?? "none"}
          disabled={saving}
          onValueChange={(v) =>
            run(updateDebriefWorkflow(row.participantId, { debriefMethod: v === "none" ? null : (v as DebriefMethod) }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue>{(value: string) => (value === "none" ? "Not set" : humanize(value))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            {DEBRIEF_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{humanize(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.debriefSentAt ? (
          fmtDate(row.debriefSentAt)
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => run(updateDebriefWorkflow(row.participantId, { markSent: true }))}
          >
            Mark sent now
          </Button>
        )}
      </TableCell>
      <TableCell>
        <NotesDialog
          initialNotes={row.debriefNotes}
          onSave={(notes) => updateDebriefWorkflow(row.participantId, { debriefNotes: notes })}
        />
      </TableCell>
    </TableRow>
  );
}
