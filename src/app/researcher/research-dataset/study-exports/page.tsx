import { Download, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { researcherScope } from "@/lib/study/researcher";
import { STUDY_EXPORTS, type StudyExportType } from "@/lib/study/exports";

export const metadata = { title: "Study Exports | LiveDrop Arena" };
export const dynamic = "force-dynamic";

export default async function StudyExportsPage() {
  const { scope } = await researcherScope();
  const { scope: contactScope } = await researcherScope("contact");
  const experiments = await prisma.experiment.findMany({
    where: { id: { in: scope } },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Research exports apply the eligibility rules (canonical, non-test, adult, website-data use granted, not excluded) and contain no
        phone, email, IGN or social values. RESTRICTED exports contain phone numbers for operational use only. Every download is logged
        with who, what and when. TEST-session data is excluded unless you choose the &quot;incl. test&quot; link.
      </p>
      {experiments.map((e) => (
        <section key={e.id} className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">{e.title}</h2>
          <div className="space-y-2">
            {(Object.keys(STUDY_EXPORTS) as StudyExportType[]).map((type) => {
              const def = STUDY_EXPORTS[type];
              const allowed = def.level !== "contact" || contactScope.includes(e.id);
              return (
                <div
                  key={type}
                  className={cn("flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3", def.sensitive ? "border-destructive/30" : "border-border")}
                >
                  <div className="max-w-2xl">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {def.sensitive && <ShieldAlert className="size-4 text-destructive" />}
                      {def.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{def.description}</p>
                  </div>
                  {allowed ? (
                    <div className="flex gap-2">
                      <a href={`/api/researcher/study-export/${type}?experimentId=${e.id}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                        <Download className="size-4" /> CSV
                      </a>
                      <a href={`/api/researcher/study-export/${type}?experimentId=${e.id}&includeTest=1`} className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
                        incl. test
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Requires researcher access</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {experiments.length === 0 && <p className="text-sm text-muted-foreground">No campaigns you can access.</p>}
    </div>
  );
}
