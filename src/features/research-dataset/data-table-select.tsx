"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DATA_TABLE_OPTIONS, type DataTableKey } from "@/lib/data-table-options";

export function DataTableSelect({ current }: { current: DataTableKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("table", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={(v) => handleChange(v ?? "participants")}>
      <SelectTrigger className="w-64">
        <SelectValue>{(v: DataTableKey) => DATA_TABLE_OPTIONS.find((o) => o.key === v)?.label ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {DATA_TABLE_OPTIONS.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
