import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { mockExperiments } from "@/lib/mock/research";

export const metadata = { title: "Reports | LiveDrop Arena" };

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Export aggregated, anonymised results for analysis outside the platform. No raw contact details are ever included."
      />

      <div className="space-y-3">
        {mockExperiments.map((exp) => (
          <div key={exp.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
                <FileSpreadsheet className="size-5" />
              </span>
              <div>
                <p className="font-medium">{exp.title}</p>
                <p className="text-xs text-muted-foreground">
                  {exp.participantCount.toLocaleString()} participants &bull; aggregated CSV / JSON
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download data-icon="inline-start" className="size-3.5" />
                CSV
              </Button>
              <Button variant="outline" size="sm">
                <Download data-icon="inline-start" className="size-3.5" />
                JSON
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
