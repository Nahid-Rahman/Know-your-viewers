"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterField } from "@/components/common/filter-field";
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

  const streamerId = searchParams.get("streamerId") ?? ANY;
  const entrySource = searchParams.get("entrySource") ?? ANY;
  const studyStatus = searchParams.get("studyStatus") ?? ANY;
  const contactSubmitted = searchParams.get("contactSubmitted") ?? ANY;
  const debriefStatus = searchParams.get("debriefStatus") ?? ANY;
  const dataUsePermission = searchParams.get("dataUsePermission") ?? ANY;
  const interviewStatus = searchParams.get("interviewStatus") ?? ANY;
  const eligibility = searchParams.get("eligibility") ?? ANY;

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <FilterField label="Search" className="col-span-2 sm:col-span-1">
          <Input
            placeholder="Code or streamer name"
            defaultValue={searchParams.get("q") ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", e.currentTarget.value);
            }}
            onBlur={(e) => setParam("q", e.currentTarget.value)}
          />
        </FilterField>

        <FilterField label="Streamer">
          <Select value={streamerId} onValueChange={(v) => setParam("streamerId", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => (v === ANY ? "All Streamers" : (streamers.find((s) => s.id === v)?.displayName ?? v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All Streamers</SelectItem>
              {streamers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Entry Source">
          <Select value={entrySource} onValueChange={(v) => setParam("entrySource", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => (v === ANY ? "All Sources" : (RECRUITMENT_SOURCE_LABELS[v as keyof typeof RECRUITMENT_SOURCE_LABELS] ?? v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All Sources</SelectItem>
              {Object.entries(RECRUITMENT_SOURCE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Study Status">
          <Select value={studyStatus} onValueChange={(v) => setParam("studyStatus", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => (v === ANY ? "Any Status" : (STUDY_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any Status</SelectItem>
              {STUDY_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Contact Submitted">
          <Select value={contactSubmitted} onValueChange={(v) => setParam("contactSubmitted", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => (v === ANY ? "Any" : (CONTACT_SUBMITTED_OPTIONS.find((o) => o.value === v)?.label ?? v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any</SelectItem>
              {CONTACT_SUBMITTED_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Debrief Status">
          <Select value={debriefStatus} onValueChange={(v) => setParam("debriefStatus", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => (v === ANY ? "Any Debrief" : humanize(v))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any Debrief</SelectItem>
              {DEBRIEF_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>{humanize(o)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Data Use Permission">
          <Select value={dataUsePermission} onValueChange={(v) => setParam("dataUsePermission", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => (v === ANY ? "Any Permission" : (DATA_USE_OPTIONS.find((o) => o.value === v)?.label ?? v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any Permission</SelectItem>
              {DATA_USE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Interview Status">
          <Select value={interviewStatus} onValueChange={(v) => setParam("interviewStatus", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => (v === ANY ? "Any Interview" : humanize(v))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any Interview</SelectItem>
              {INTERVIEW_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>{humanize(o)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Research Eligibility">
          <Select value={eligibility} onValueChange={(v) => setParam("eligibility", v ?? ANY)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string) => (v === ANY ? "Any Eligibility" : (ELIGIBILITY_OPTIONS.find((o) => o.value === v)?.label ?? v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any Eligibility</SelectItem>
              {ELIGIBILITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="First Visit From">
          <Input
            type="date"
            defaultValue={searchParams.get("from") ?? ""}
            onChange={(e) => setParam("from", e.currentTarget.value)}
          />
        </FilterField>

        <FilterField label="First Visit To">
          <Input
            type="date"
            defaultValue={searchParams.get("to") ?? ""}
            onChange={(e) => setParam("to", e.currentTarget.value)}
          />
        </FilterField>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
            Reset filters
          </Button>
        </div>
      )}
    </div>
  );
}
