"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterField } from "@/components/common/filter-field";

export type FilterDef =
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; anyLabel?: string }
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "date" }
  | { key: string; label: string; type: "checkbox" };

const SELECT = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm";

/** URL-driven filter bar: every filter is a labelled search param. */
export function QueryFilters({ defs }: { defs: FilterDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function set(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {defs.map((d) => (
          <FilterField key={d.key} label={d.label}>
            {d.type === "select" ? (
              <select aria-label={d.label} className={SELECT} value={sp.get(d.key) ?? ""} onChange={(e) => set(d.key, e.target.value)}>
                <option value="">{d.anyLabel ?? "Any"}</option>
                {d.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : d.type === "text" ? (
              <Input
                aria-label={d.label}
                placeholder={d.placeholder}
                defaultValue={sp.get(d.key) ?? ""}
                onKeyDown={(e) => e.key === "Enter" && set(d.key, e.currentTarget.value)}
                onBlur={(e) => e.currentTarget.value !== (sp.get(d.key) ?? "") && set(d.key, e.currentTarget.value)}
              />
            ) : d.type === "date" ? (
              <Input aria-label={d.label} type="date" value={sp.get(d.key) ?? ""} onChange={(e) => set(d.key, e.target.value)} />
            ) : (
              <label className="flex h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={sp.get(d.key) === "1"} onChange={(e) => set(d.key, e.target.checked ? "1" : "")} />
                Yes
              </label>
            )}
          </FilterField>
        ))}
      </div>
      {[...sp.keys()].some((k) => k !== "page") && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
