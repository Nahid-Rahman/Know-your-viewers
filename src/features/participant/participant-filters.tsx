"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RECRUITMENT_SOURCE_LABELS } from "@/lib/entry-source";

const ANY = "any";

const STUDY_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
];

const CONTACT_SUBMITTED_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const DEBRIEF_STATUS_OPTIONS = ["PENDING", "CONTACTED", "EXPLAINED", "ACKNOWLEDGED", "DECLINED", "UNREACHABLE"];

const DATA_USE_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "yes", label: "Approved" },
  { value: "no", label: "Declined" },
  { value: "withdrawn", label: "Withdrawn" },
];

const INTERVIEW_STATUS_OPTIONS = [
  "NOT_INVITED",
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "SCHEDULED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];

const ELIGIBILITY_OPTIONS = [
  { value: "eligible", label: "Eligible" },
  { value: "excluded", label: "Excluded" },
];

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function ParticipantFilters({ streamers }: { streamers: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ANY || value === "") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = [...searchParams.keys()].some((k) => k !== "page");

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <Input
        placeholder="Search by code or streamer..."
        defaultValue={searchParams.get("q") ?? ""}
        className="w-52"
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("q", e.currentTarget.value);
        }}
        onBlur={(e) => setParam("q", e.currentTarget.value)}
      />

      <Select value={searchParams.get("streamerId") ?? ANY} onValueChange={(v) => setParam("streamerId", v ?? ANY)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Streamer" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All Streamers</SelectItem>
          {streamers.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.displayName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("entrySource") ?? ANY} onValueChange={(v) => setParam("entrySource", v ?? ANY)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Entry Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All Sources</SelectItem>
          {Object.entries(RECRUITMENT_SOURCE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("studyStatus") ?? ANY} onValueChange={(v) => setParam("studyStatus", v ?? ANY)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Study Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any Status</SelectItem>
          {STUDY_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("contactSubmitted") ?? ANY}
        onValueChange={(v) => setParam("contactSubmitted", v ?? ANY)}
      >
        <SelectTrigger className="w-36"><SelectValue placeholder="Contact" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any Contact</SelectItem>
          {CONTACT_SUBMITTED_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("debriefStatus") ?? ANY} onValueChange={(v) => setParam("debriefStatus", v ?? ANY)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Debrief" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any Debrief</SelectItem>
          {DEBRIEF_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o} value={o}>{humanize(o)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("dataUsePermission") ?? ANY}
        onValueChange={(v) => setParam("dataUsePermission", v ?? ANY)}
      >
        <SelectTrigger className="w-40"><SelectValue placeholder="Data Use" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any Permission</SelectItem>
          {DATA_USE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("interviewStatus") ?? ANY}
        onValueChange={(v) => setParam("interviewStatus", v ?? ANY)}
      >
        <SelectTrigger className="w-40"><SelectValue placeholder="Interview" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any Interview</SelectItem>
          {INTERVIEW_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o} value={o}>{humanize(o)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("eligibility") ?? ANY} onValueChange={(v) => setParam("eligibility", v ?? ANY)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Eligibility" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any Eligibility</SelectItem>
          {ELIGIBILITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-36"
        defaultValue={searchParams.get("from") ?? ""}
        onChange={(e) => setParam("from", e.currentTarget.value)}
        aria-label="From date"
      />
      <Input
        type="date"
        className="w-36"
        defaultValue={searchParams.get("to") ?? ""}
        onChange={(e) => setParam("to", e.currentTarget.value)}
        aria-label="To date"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Reset filters
        </Button>
      )}
    </div>
  );
}
