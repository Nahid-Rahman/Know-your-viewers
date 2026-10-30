"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addAnnotationAction, importPlatformMetricsAction, savePlatformMetricAction, type PlatformMetricInput } from "@/lib/actions/study-admin";

const SELECT = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm";

export function AnnotationForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [type, setType] = useState("CHAT_QUESTION");
  const [occurredAt, setOccurredAt] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-2 sm:grid-cols-[auto_auto_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addAnnotationAction(sessionId, { type: type as "OTHER", occurredAt, note });
          if ("error" in r) return void toast.error(r.error);
          toast.success("Annotation added.");
          setNote("");
          router.refresh();
        });
      }}
    >
      <select aria-label="Annotation type" className={SELECT} value={type} onChange={(e) => setType(e.target.value)}>
        <option value="STREAM_START">Stream start</option>
        <option value="STREAM_END">Stream end</option>
        <option value="CHAT_QUESTION">Chat question</option>
        <option value="CHAT_ANSWER">Chat answer</option>
        <option value="LINK_SHARED">Known link sharing</option>
        <option value="OTHER">Other</option>
      </select>
      <Input aria-label="When (Asia/Dhaka)" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
      <Input aria-label="Note" placeholder="What happened (no viewer personal data)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button size="sm" type="submit" disabled={pending}>Add</Button>
    </form>
  );
}

const METRIC_FIELDS: { key: keyof PlatformMetricInput; label: string }[] = [
  { key: "durationMinutes", label: "Stream duration (min)" },
  { key: "views", label: "Views" },
  { key: "avgConcurrentViewers", label: "Avg concurrent viewers" },
  { key: "peakConcurrentViewers", label: "Peak concurrent viewers" },
  { key: "watchTimeMinutes", label: "Watch time (min)" },
  { key: "avgViewDurationSeconds", label: "Avg view duration (s)" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments / chat messages" },
  { key: "shares", label: "Shares" },
  { key: "newFollowers", label: "New followers / subscribers" },
];

export function PlatformMetricForm({ sessionId, defaultPlatform }: { sessionId: string; defaultPlatform: string }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>({ platform: defaultPlatform, source: "", measuredAt: "" });
  const [csv, setCsv] = useState("");
  const [pending, start] = useTransition();
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));
  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await savePlatformMetricAction(sessionId, v as PlatformMetricInput);
            if ("error" in r) return void toast.error(r.error);
            toast.success("Metrics saved.");
            setV({ platform: defaultPlatform, source: "", measuredAt: "" });
            router.refresh();
          });
        }}
      >
        <p className="text-xs text-muted-foreground">Leave a metric blank when it isn&apos;t available — blank is stored as missing, never as 0.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label className="mb-1" htmlFor="m-platform">Platform</Label>
            <Input id="m-platform" value={v.platform ?? ""} onChange={(e) => set("platform", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1" htmlFor="m-sid">Platform stream id</Label>
            <Input id="m-sid" value={v.platformStreamId ?? ""} onChange={(e) => set("platformStreamId", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1" htmlFor="m-source">Measurement source</Label>
            <Input id="m-source" placeholder="YouTube Studio export" value={v.source ?? ""} onChange={(e) => set("source", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1" htmlFor="m-at">Read at (Dhaka)</Label>
            <Input id="m-at" type="datetime-local" value={v.measuredAt ?? ""} onChange={(e) => set("measuredAt", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1" htmlFor="m-ws">Window start (Dhaka)</Label>
            <Input id="m-ws" type="datetime-local" value={v.windowStart ?? ""} onChange={(e) => set("windowStart", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1" htmlFor="m-we">Window end (Dhaka)</Label>
            <Input id="m-we" type="datetime-local" value={v.windowEnd ?? ""} onChange={(e) => set("windowEnd", e.target.value)} />
          </div>
          {METRIC_FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="mb-1" htmlFor={`m-${f.key}`}>{f.label}</Label>
              <Input id={`m-${f.key}`} inputMode="numeric" value={v[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
          <div className="sm:col-span-3">
            <Label className="mb-1" htmlFor="m-notes">Notes (game, content differences, caveats)</Label>
            <Textarea id="m-notes" rows={2} value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <Button size="sm" type="submit" disabled={pending}>Save metrics</Button>
      </form>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Import CSV</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Header row with any of: platform, platformStreamId, source, measuredAt, windowStart, windowEnd, durationMinutes, views,
          avgConcurrentViewers, peakConcurrentViewers, watchTimeMinutes, avgViewDurationSeconds, likes, comments, shares, newFollowers, notes.
          Times as YYYY-MM-DDTHH:mm (Dhaka). No commas inside values.
        </p>
        <Textarea className="mt-2 font-mono text-xs" rows={4} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          disabled={pending || !csv.trim()}
          onClick={() =>
            start(async () => {
              const r = await importPlatformMetricsAction(sessionId, csv);
              if ("error" in r) return void toast.error(r.error);
              toast.success(`Imported ${r.data.rows} row(s).`);
              setCsv("");
              router.refresh();
            })
          }
        >
          Import
        </Button>
      </details>
    </div>
  );
}
