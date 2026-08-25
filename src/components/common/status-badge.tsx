import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-secondary text-muted-foreground border-border",
  ACTIVE: "bg-accent-green/10 text-accent-green border-accent-green/30",
  COMPLETED: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30",
  ARCHIVED: "bg-muted text-muted-foreground border-border",
  PENDING: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  INACTIVE: "bg-destructive/10 text-destructive border-destructive/30",
  GRANTED: "bg-accent-green/10 text-accent-green border-accent-green/30",
  DECLINED: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold capitalize", STATUS_CLASSES[status] ?? "", className)}
    >
      {status.toLowerCase()}
    </Badge>
  );
}
