"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyableCode } from "@/components/common/copyable-code";
import { revealContact } from "@/lib/actions/contacts";

/** Only ever decrypts on an explicit click here — never for list rendering. */
export function RevealContactButton({ participantId }: { participantId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ email: string | null; phone: string | null } | null>(null);

  async function handleReveal() {
    setPending(true);
    const res = await revealContact(participantId);
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setResult(res);
    setOpen(true);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleReveal}>
        <Eye data-icon="inline-start" />
        {pending ? "..." : "Reveal"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Contact details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email</p>
              {result?.email ? <CopyableCode value={result.email} /> : <p className="text-muted-foreground">Not provided</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Phone</p>
              {result?.phone ? <CopyableCode value={result.phone} /> : <p className="text-muted-foreground">Not provided</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
