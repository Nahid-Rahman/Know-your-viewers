import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Marks a block whose text the public site no longer reads, so edits there change nothing. */
export function NotUsedNote({ where = "Campaigns → Sessions → a session → Homepage & wheel configuration" }: { where?: string }) {
  return (
    <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs">
      <strong>Not used on the live site.</strong> Editing this changes nothing. Edit it in {where}.
    </p>
  );
}

/** Marks a block that the live homepage still reads from this page. */
export function LiveOnSiteNote() {
  return (
    <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs">
      <strong>Live on the homepage.</strong> Changes here show on the site after saving.
    </p>
  );
}

export function ContentSection({
  title,
  children,
  onAdd,
  note,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  note?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {note}
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        {onAdd && (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus data-icon="inline-start" className="size-3.5" />
            Add
          </Button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label="Remove">
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
