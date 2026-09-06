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

  // Contact / outreach workflow
  NOT_CONTACTED: "bg-secondary text-muted-foreground border-border",
  CONTACTED: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  DEBRIEFED: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30",
  INTERVIEW_INVITED: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  INTERVIEW_COMPLETED: "bg-accent-green/10 text-accent-green border-accent-green/30",
  UNREACHABLE: "bg-destructive/10 text-destructive border-destructive/30",

  // Debrief queue
  CONTACTED_PENDING: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  EXPLAINED: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  ACKNOWLEDGED: "bg-accent-green/10 text-accent-green border-accent-green/30",

  // Interview candidate / record status
  NOT_INVITED: "bg-secondary text-muted-foreground border-border",
  INVITED: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  ACCEPTED: "bg-accent-green/10 text-accent-green border-accent-green/30",
  SCHEDULED: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30",
  NO_SHOW: "bg-destructive/10 text-destructive border-destructive/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  RESCHEDULED: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",

  // Research eligibility (not a DB enum value — passed in directly)
  ELIGIBLE: "bg-accent-green/10 text-accent-green border-accent-green/30",
  EXCLUDED: "bg-destructive/10 text-destructive border-destructive/30",
  WITHDRAWN: "bg-destructive/10 text-destructive border-destructive/30",

  // Recruitment entry source
  STREAM_QR: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30",
  STREAM_CHAT_LINK: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  STREAM_DESCRIPTION: "bg-accent-violet/10 text-accent-violet border-accent-violet/30",
  DIRECT: "bg-secondary text-muted-foreground border-border",
  OTHER: "bg-secondary text-muted-foreground border-border",
};

function humanize(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-semibold", STATUS_CLASSES[status] ?? "", className)}>
      {humanize(status)}
    </Badge>
  );
}
