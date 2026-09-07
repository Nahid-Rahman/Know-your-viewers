"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterField } from "@/components/common/filter-field";

const ANY = "any";

const STATUS_OPTIONS = [
  { value: "NOT_CONTACTED", label: "Not Contacted" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "DEBRIEFED", label: "Debriefed" },
  { value: "INTERVIEW_INVITED", label: "Interview Invited" },
  { value: "INTERVIEW_COMPLETED", label: "Interview Completed" },
  { value: "UNREACHABLE", label: "Unreachable" },
];

export function ContactFilters({ researchers }: { researchers: { id: string; name: string }[] }) {
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
    <div className="mb-4 rounded-xl border border-border bg-card p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        <FilterField label="Contact Status">
          <Select value={searchParams.get("contactStatus") ?? ANY} onValueChange={(v) => setParam("contactStatus", v ?? ANY)}>
            <SelectTrigger className="w-full"><SelectValue>{(v: string) => (v === ANY ? "Any Status" : STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v)}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any Status</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Assigned Researcher">
          <Select
            value={searchParams.get("researcherAssignedId") ?? ANY}
            onValueChange={(v) => setParam("researcherAssignedId", v ?? ANY)}
          >
            <SelectTrigger className="w-full"><SelectValue>{(v: string) => (v === ANY ? "Any Researcher" : researchers.find((r) => r.id === v)?.name ?? v)}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any Researcher</SelectItem>
              {researchers.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Next Follow-up">
          <Select
            value={searchParams.get("overdueFollowup") ?? ANY}
            onValueChange={(v) => setParam("overdueFollowup", v ?? ANY)}
          >
            <SelectTrigger className="w-full"><SelectValue>{(v: string) => (v === ANY ? "All Follow-ups" : "Overdue Follow-up")}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All Follow-ups</SelectItem>
              <SelectItem value="true">Overdue Follow-up</SelectItem>
            </SelectContent>
          </Select>
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
