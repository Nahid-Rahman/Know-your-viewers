import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTableSelect } from "@/features/research-dataset/data-table-select";
import { getDataTable, DATA_TABLE_OPTIONS, DATA_TABLE_PAGE_SIZE, type DataTableKey } from "@/lib/queries/data-tables";

export const metadata = { title: "Browse Tables | LiveDrop Arena" };

function fmtCell(value: string | number | boolean | null): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function DataTablesPage({
  searchParams,
}: PageProps<"/researcher/research-dataset/tables">) {
  const sp = await searchParams;
  const tableKey = (typeof sp.table === "string" && DATA_TABLE_OPTIONS.some((o) => o.key === sp.table)
    ? sp.table
    : "participants") as DataTableKey;
  const page = typeof sp.page === "string" ? Math.max(Number(sp.page) || 1, 1) : 1;

  const { columns, rows, total } = await getDataTable(tableKey, page);
  const totalPages = Math.max(Math.ceil(total / DATA_TABLE_PAGE_SIZE), 1);

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams({ table: tableKey, page: String(p) });
    return `/researcher/research-dataset/tables?${params.toString()}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DataTableSelect current={tableKey} />
        <p className="text-sm text-muted-foreground">{total.toLocaleString("en-US")} total rows</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No rows yet" description="This table doesn't have any data yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="max-w-72 truncate text-sm whitespace-nowrap">
                      {fmtCell(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {(page - 1) * DATA_TABLE_PAGE_SIZE + 1}&ndash;{Math.min(page * DATA_TABLE_PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={buildPageHref(Math.max(page - 1, 1))}
              aria-disabled={page <= 1}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-40")}
            >
              Previous
            </Link>
            <span>
              Page {page} of {totalPages}
            </span>
            <Link
              href={buildPageHref(Math.min(page + 1, totalPages))}
              aria-disabled={page >= totalPages}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                page >= totalPages && "pointer-events-none opacity-40",
              )}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
