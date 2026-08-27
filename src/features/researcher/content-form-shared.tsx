import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContentSection({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
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
