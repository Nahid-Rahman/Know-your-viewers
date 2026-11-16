"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openSupportRequestAction } from "@/lib/actions/study-admin";

type Opened = { contact: { label: string; value: string }[]; message: string };

/** Decrypts one support request on an explicit click (audited server-side). Values live only in memory. */
export function OpenSupportRequest({ id }: { id: string }) {
  const [data, setData] = useState<Opened | null>(null);
  const [pending, start] = useTransition();

  if (!data) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await openSupportRequestAction(id);
            if ("error" in r) return void toast.error(r.error);
            setData(r.data);
          })
        }
      >
        {pending ? "Opening…" : "Open (logged)"}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-sm">
      {data.contact.length > 0 ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {data.contact.map((c) => (
            <div key={c.label} className="contents">
              <dt className="text-muted-foreground">{c.label}</dt>
              <dd className="break-all">{c.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">No extra contact details — see the linked entry.</p>
      )}
      <p className="border-t border-border pt-2 whitespace-pre-wrap">{data.message || "—"}</p>
      <Button size="sm" variant="outline" onClick={() => setData(null)}>
        Hide
      </Button>
    </div>
  );
}
