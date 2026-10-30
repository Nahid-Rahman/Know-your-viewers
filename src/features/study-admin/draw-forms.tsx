"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runDrawAction, updatePayoutAction } from "@/lib/actions/study-admin";

export function RunDrawForm({
  experimentId,
  isTest,
  liveWinnerCount,
  eligibleCount,
  blocked,
}: {
  experimentId: string;
  isTest: boolean;
  liveWinnerCount: number | null;
  eligibleCount: number;
  blocked: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const n = isTest ? Number(count) : liveWinnerCount;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isTest ? (
        <Input aria-label="Number of winners for this test draw" type="number" min={1} placeholder="winners" className="w-28" value={count} onChange={(e) => setCount(e.target.value)} />
      ) : (
        <span className="text-sm">Approved winner count: {liveWinnerCount ?? "not decided"}</span>
      )}
      {!confirming ? (
        <Button size="sm" disabled={blocked || !n || pending} onClick={() => setConfirming(true)}>
          Run {isTest ? "test " : ""}draw
        </Button>
      ) : (
        <>
          <span className="text-xs text-muted-foreground">
            Draw {n} of {eligibleCount} eligible entries? This is final and can&apos;t be rerun (only voided with a reason).
          </span>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await runDrawAction(experimentId, isTest, isTest ? Number(count) : undefined);
                setConfirming(false);
                if ("error" in r) return void toast.error(r.error);
                toast.success("Draw finalized.");
                router.refresh();
              })
            }
          >
            Confirm draw
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
        </>
      )}
    </div>
  );
}

export function PayoutForm({ winnerId, status, paymentRef }: { winnerId: string; status: string; paymentRef: string | null }) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [ref, setRef] = useState(paymentRef ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Payout status" className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" value={s} onChange={(e) => setS(e.target.value)}>
        <option value="PENDING">Pending</option>
        <option value="PAID">Paid</option>
        <option value="FAILED">Failed</option>
        <option value="UNREACHABLE">Unreachable</option>
      </select>
      <Input aria-label="bKash transaction reference" placeholder="bKash TrxID (never PIN/OTP)" className="h-8 w-48 text-xs" value={ref} onChange={(e) => setRef(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || (s === status && ref === (paymentRef ?? ""))}
        onClick={() =>
          start(async () => {
            const r = await updatePayoutAction(winnerId, s as "PAID", ref);
            if ("error" in r) return void toast.error(r.error);
            toast.success("Payout updated.");
            router.refresh();
          })
        }
      >
        Save
      </Button>
    </div>
  );
}
