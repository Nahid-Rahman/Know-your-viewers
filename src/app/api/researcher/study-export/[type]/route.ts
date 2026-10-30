import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth";
import { buildStudyExport, STUDY_EXPORTS, type StudyExportType } from "@/lib/study/exports";

/**
 * Revised-flow exports. Each type enforces its own access level and is
 * written to the audit log (who, which category, row count, when).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/researcher/study-export/[type]">) {
  const { type } = await ctx.params;
  if (!(type in STUDY_EXPORTS)) return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  const url = new URL(request.url);
  const experimentId = url.searchParams.get("experimentId") ?? "";
  const includeTest = url.searchParams.get("includeTest") === "1";
  try {
    const user = await requireRole("RESEARCHER");
    const { filename, csv } = await buildStudyExport(user, type as StudyExportType, experimentId, includeTest);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
