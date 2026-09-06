import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError } from "@/lib/auth";
import { getExperimentById } from "@/lib/queries/research";

// Self-contained (not the shared getParticipantRows, which now serves the
// richer Participants screen with a different, paginated shape) so this
// older per-experiment export keeps working unchanged.
async function getLegacyExportRows(experimentId: string) {
  const participants = await prisma.participant.findMany({
    where: { experimentId },
    include: {
      condition: { select: { name: true } },
      contact: { select: { id: true } },
      debrief: { select: { permissionGiven: true } },
      events: { where: { type: "SPIN_CLICKED" }, select: { id: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  return participants.map((p) => ({
    anonymousCode: p.anonymousCode,
    conditionName: p.condition?.name ?? "Unassigned",
    consentStatus: p.consentStatus,
    spun: p.events.length > 0,
    submittedContact: Boolean(p.contact),
    debriefed: Boolean(p.debrief),
    permissionGiven: p.debrief?.permissionGiven ?? null,
  }));
}

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

  const rows = await getLegacyExportRows(id);
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
