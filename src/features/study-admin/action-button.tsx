"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type ActionResult = { ok: true; data?: unknown } | { error: string };

/**
 * Runs a (bound) server action, optionally after a confirmation dialog that
 * can also collect a required reason. Errors from the server are shown as-is.
 */
export function ActionButton({
  action,
  label,
  confirmTitle,
  confirmText,
  reasonLabel,
  reasonRequired = false,
  variant = "outline",
  size = "sm",
  successMessage,
  disabled,
}: {
  action: (reason: string) => Promise<ActionResult>;
  label: string;
  confirmTitle?: string;
  confirmText?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  size?: "sm" | "default";
  successMessage?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const needsDialog = Boolean(confirmTitle || reasonLabel);

  function go() {
    start(async () => {
      const r = await action(reason);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(successMessage ?? "Saved.");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant={variant} size={size} disabled={disabled || pending} onClick={() => (needsDialog ? setOpen(true) : go())}>
        {pending && !needsDialog ? "Working…" : label}
      </Button>
      {needsDialog && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmTitle ?? label}</DialogTitle>
              {confirmText && <DialogDescription>{confirmText}</DialogDescription>}
            </DialogHeader>
            {reasonLabel && (
              <div>
                <Label className="mb-1.5">{reasonLabel}</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={variant === "destructive" ? "destructive" : "default"}
                disabled={pending || (reasonRequired && !reason.trim())}
                onClick={go}
              >
                {pending ? "Working…" : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
