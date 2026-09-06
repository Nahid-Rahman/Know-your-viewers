"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ANY = "any";

const STATUS_OPTIONS = [
  { value: "NOT_INVITED", label: "Not Invited" },
  { value: "INVITED", label: "Invited" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NO_SHOW", label: "No Show" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function InterviewFilters() {
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

      <Select value={searchParams.get("status") ?? ANY} onValueChange={(v) => setParam("status", v ?? ANY)}>
        <SelectTrigger className="w-44">
          <SelectValue>{(v: string) => (v === ANY ? "Any Status" : STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any Status</SelectItem>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Reset filters
        </Button>
      )}
    </div>
  );
}
