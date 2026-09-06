import { Download, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Research Dataset | LiveDrop Arena" };

const EXPORTS = [
  {
    type: "behavioral",
    title: "Behavioral dataset",
    description: "One row per participant: funnel stage, study status, reward, permission, debrief/interview status, eligibility. No contact info.",
    restricted: false,
  },
  {
    type: "responses",
    title: "Survey responses",
    description: "One row per answered survey question.",
    restricted: false,
  },
  {
    type: "events",
    title: "Raw engagement events",
    description: "The full event log — page, element, value, and timestamp for every recorded action.",
    restricted: false,
  },
  {
    type: "interviews",
    title: "Interview status",
    description: "Consent, candidate status, and interview scheduling/summary per participant.",
    restricted: false,
  },
  {
    type: "contacts",
    title: "Contact export (restricted)",
    description: "Decrypted email and phone number, for outreach/payout use only. Never share outside the research team.",
    restricted: true,
  },
] as const;

export default function ResearchDatasetExportsPage() {
  return (
    <div className="space-y-3">
      {EXPORTS.map((exp) => (
        <div
          key={exp.type}
          className={cn(
            "flex items-center justify-between rounded-xl border bg-card p-5",
            exp.restricted ? "border-destructive/30" : "border-border",
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                exp.restricted ? "bg-destructive/10 text-destructive" : "bg-accent-cyan/10 text-accent-cyan",
              )}
            >
              {exp.restricted ? <ShieldAlert className="size-5" /> : <FileSpreadsheet className="size-5" />}
            </span>
            <div>
              <p className="font-medium">{exp.title}</p>
              <p className="max-w-xl text-xs text-muted-foreground">{exp.description}</p>
            </div>
          </div>
          <a
            href={`/api/researcher/research-dataset/${exp.type}`}
            className={cn(buttonVariants({ variant: exp.restricted ? "destructive" : "outline", size: "sm" }))}
          >
            <Download data-icon="inline-start" className="size-3.5" />
            CSV
          </a>
        </div>
      ))}
    </div>
  );
}
