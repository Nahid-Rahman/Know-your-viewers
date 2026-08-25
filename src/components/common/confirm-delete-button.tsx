"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Self-contained confirm-then-delete control: a trigger button plus its own confirmation dialog. */
export function ConfirmDeleteButton({
  label,
  confirmTitle = "Are you sure?",
  confirmDescription,
  onConfirm,
  triggerVariant = "ghost",
  triggerSize = "icon-sm",
  requireTypedConfirmation,
  redirectTo,
}: {
  label?: React.ReactNode;
  confirmTitle?: string;
  confirmDescription: string;
  onConfirm: () => Promise<{ error: string } | { ok: true }>;
  triggerVariant?: "ghost" | "outline" | "destructive";
  triggerSize?: "sm" | "icon-sm" | "default";
  /** If set, the confirm button stays disabled until this exact text is typed — for irreversible/cascading deletes. */
  requireTypedConfirmation?: string;
  /** Navigate here after a successful delete instead of refreshing in place (e.g. the deleted item's own page). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState("");

  async function handleConfirm() {
    setPending(true);
    const result = await onConfirm();
    setPending(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    setTyped("");
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  const locked = Boolean(requireTypedConfirmation) && typed !== requireTypedConfirmation;

  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {label ?? <Trash2 className="size-4 text-destructive" />}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          {requireTypedConfirmation && (
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              placeholder={`Type "${requireTypedConfirmation}" to confirm`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending || locked} onClick={handleConfirm}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
