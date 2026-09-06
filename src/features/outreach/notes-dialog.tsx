"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NotesDialog({
  initialNotes,
  onSave,
}: {
  initialNotes: string | null;
  onSave: (notes: string) => Promise<{ error: string } | { ok: true }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");

  async function handleSave() {
    setPending(true);
    const result = await onSave(notes);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {initialNotes ? "Notes" : "Add note"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
          </DialogHeader>
          <Textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} className="min-h-24" />
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={handleSave} className="bg-gradient-primary text-white hover:opacity-90">
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
