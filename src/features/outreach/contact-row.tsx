"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { RarityBadge, type Rarity } from "@/components/common/rarity-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RevealContactButton } from "@/features/outreach/reveal-contact-button";
import { LogAttemptDialog } from "@/features/outreach/log-attempt-dialog";
import { NotesDialog } from "@/features/outreach/notes-dialog";
import {
  updateContactStatus,
  assignResearcher,
  setNextFollowup,
  setPrizeFulfillment,
  updateContactNotes,
} from "@/lib/actions/contacts";
import type { ContactQueueRow } from "@/lib/queries/research";
import type { ContactStatus, PrizeFulfillmentStatus } from "@/generated/prisma/enums";

function humanize(value: string) {
  return value.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const CONTACT_STATUSES: ContactStatus[] = [
  "NOT_CONTACTED",
  "CONTACTED",
  "DEBRIEFED",
  "INTERVIEW_INVITED",
  "INTERVIEW_COMPLETED",
  "UNREACHABLE",
];
const PRIZE_STATUSES: PrizeFulfillmentStatus[] = ["SELECTED", "WON", "CLAIMED", "NOT_CLAIMED", "DELIVERED"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US");
}

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function ContactRow({
  row,
  researchers,
}: {
  row: ContactQueueRow;
  researchers: { id: string; name: string }[];
}) {
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
    <TableRow className={cn(saving && "opacity-60 transition-opacity")}>
      <TableCell className="font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <Link href={`/researcher/participants/${row.participantId}`} className="hover:underline">
            {row.anonymousCode}
          </Link>
          {saving && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.streamerName ?? "—"}</TableCell>
      <TableCell>
        {row.rewardLabel ? (
          <div className="flex items-center gap-1.5 text-sm">
            {row.rewardLabel}
            {row.rewardRarity && <RarityBadge rarity={row.rewardRarity.toLowerCase() as Rarity} variant="pill" />}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{fmtDate(row.contactSubmittedAt)}</TableCell>
      <TableCell>
        <Select
          value={row.contactStatus}
          disabled={saving}
          onValueChange={(v) => run(updateContactStatus(row.participantId, (v ?? "NOT_CONTACTED") as ContactStatus))}
        >
          <SelectTrigger className="w-40">
            <SelectValue>{(value: ContactStatus) => humanize(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CONTACT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={row.researcherAssignedId ?? "none"}
          disabled={saving}
          onValueChange={(v) => run(assignResearcher(row.participantId, v === "none" ? null : v))}
        >
          <SelectTrigger className="w-36">
            <SelectValue>
              {(value: string) => (value === "none" ? "Unassigned" : (researchers.find((r) => r.id === value)?.name ?? value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {researchers.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="date"
          className="w-36"
          defaultValue={toDateInputValue(row.nextFollowupAt)}
          disabled={saving}
          onChange={(e) => run(setNextFollowup(row.participantId, e.currentTarget.value || null))}
        />
      </TableCell>
      <TableCell className="text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{row.attemptCount}</span>
          <LogAttemptDialog participantId={row.participantId} />
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={row.prizeFulfillmentStatus ?? "SELECTED"}
          disabled={saving}
          onValueChange={(v) => run(setPrizeFulfillment(row.participantId, (v ?? "SELECTED") as PrizeFulfillmentStatus))}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{(value: PrizeFulfillmentStatus) => humanize(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRIZE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <RevealContactButton participantId={row.participantId} />
          <NotesDialog
            initialNotes={row.contactNotes}
            onSave={(notes) => updateContactNotes(row.participantId, notes)}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
