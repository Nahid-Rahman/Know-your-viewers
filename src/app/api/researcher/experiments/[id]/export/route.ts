import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import { getExperimentById, getParticipantRows } from "@/lib/queries/research";

export async function GET(request: Request, ctx: RouteContext<"/api/researcher/experiments/[id]/export">) {
  const { id } = await ctx.params;

  let researcher;
  try {
    researcher = await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const owned = await prisma.experiment.findUnique({ where: { id }, select: { researcherId: true } });
  if (!owned || owned.researcherId !== researcher.id) {
    return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
  }

  const experiment = await getExperimentById(id);
  if (!experiment) return NextResponse.json({ error: "Experiment not found." }, { status: 404 });

  const rows = await getParticipantRows(id);
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";

  if (format === "json") {
    return new NextResponse(JSON.stringify({ experiment, participants: rows }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${experiment.id}.json"`,
      },
    });
  }

  const header = "anonymousCode,conditionName,consentStatus,spun,submittedContact,debriefed,permissionGiven";
  const csvRows = rows.map((r) =>
    [
      r.anonymousCode,
      r.conditionName,
      r.consentStatus,
      r.spun,
      r.submittedContact,
      r.debriefed,
      r.permissionGiven ?? "",
    ].join(","),
  );
  const csv = [header, ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${experiment.id}.csv"`,
    },
  });
}
