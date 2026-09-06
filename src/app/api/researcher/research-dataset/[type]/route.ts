import { NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { decryptContact } from "@/lib/crypto";
import { toCsv } from "@/lib/csv";
import {
  getBehavioralDatasetRows,
  getSurveyResponseExportRows,
  getEventExportRows,
  getInterviewStatusExportRows,
  getContactExportSourceRows,
} from "@/lib/queries/research";

const DATASET_TYPES = ["behavioral", "responses", "events", "interviews", "contacts"] as const;
type DatasetType = (typeof DATASET_TYPES)[number];

async function buildCsv(type: DatasetType): Promise<{ filename: string; csv: string }> {
  switch (type) {
    case "behavioral": {
      const rows = await getBehavioralDatasetRows();
      return {
        filename: "research-dataset-behavioral.csv",
        csv: toCsv(
          [
            "participant_id",
            "experiment",
            "condition",
            "streamer",
            "entry_source",
            "first_visit",
            "current_stage",
            "study_status",
            "reward_label",
            "reward_rarity",
            "data_use_permission",
            "debrief_status",
            "interview_status",
            "eligible",
          ],
          rows.map((r) => [
            r.participantId,
            r.experimentTitle,
            r.conditionName,
            r.streamerName,
            r.entrySource,
            r.firstVisit,
            r.currentStage,
            r.studyStatus,
            r.rewardLabel,
            r.rewardRarity,
            r.dataUsePermission,
            r.debriefStatus,
            r.interviewStatus,
            r.eligible,
          ]),
        ),
      };
    }
    case "responses": {
      const rows = await getSurveyResponseExportRows();
      return {
        filename: "research-dataset-responses.csv",
        csv: toCsv(
          ["participant_id", "survey", "question_order", "question", "answer", "submitted_at"],
          rows.map((r) => [r.participantId, r.surveyTitle, r.questionOrder, r.questionText, r.answer, r.submittedAt]),
        ),
      };
    }
    case "events": {
      const rows = await getEventExportRows();
      return {
        filename: "research-dataset-events.csv",
        csv: toCsv(
          ["participant_id", "type", "page", "element", "event_value", "timestamp"],
          rows.map((r) => [r.participantId, r.type, r.page, r.element, r.eventValue, r.timestamp]),
        ),
      };
    }
    case "interviews": {
      const rows = await getInterviewStatusExportRows();
      return {
        filename: "research-dataset-interviews.csv",
        csv: toCsv(
          [
            "participant_id",
            "invited",
            "consent",
            "status",
            "interview_mode",
            "scheduled_at",
            "duration_minutes",
            "themes",
            "summary",
          ],
          rows.map((r) => [
            r.participantId,
            r.invited,
            r.consent,
            r.status,
            r.interviewMode,
            r.scheduledAt,
            r.durationMinutes,
            r.themes,
            r.summary,
          ]),
        ),
      };
    }
    case "contacts": {
      const participants = await getContactExportSourceRows();
      const rows = participants.map((p) => {
        const contact = p.contact!;
        const primary = decryptContact(contact.encryptedValue);
        const primaryIsEmail = primary.includes("@");
        const email = primaryIsEmail ? primary : "";
        const phone = contact.encryptedPhone ? decryptContact(contact.encryptedPhone) : primaryIsEmail ? "" : primary;
        return {
          participantId: p.anonymousCode,
          email,
          phone,
          streamerName: p.streamer?.displayName ?? "",
          rewardLabel: p.rewardLabel ?? "",
          contactStatus: p.contactWorkflow?.contactStatus ?? "NOT_CONTACTED",
          prizeFulfillmentStatus: p.contactWorkflow?.prizeFulfillmentStatus ?? "",
        };
      });
      return {
        filename: "research-dataset-contacts-RESTRICTED.csv",
        csv: toCsv(
          ["participant_id", "email", "phone", "streamer", "reward_label", "contact_status", "prize_fulfillment_status"],
          rows.map((r) => [r.participantId, r.email, r.phone, r.streamerName, r.rewardLabel, r.contactStatus, r.prizeFulfillmentStatus]),
        ),
      };
    }
  }
}

export async function GET(_request: Request, ctx: RouteContext<"/api/researcher/research-dataset/[type]">) {
  try {
    await requireRole("RESEARCHER");
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const { type } = await ctx.params;
  if (!DATASET_TYPES.includes(type as DatasetType)) {
    return NextResponse.json({ error: "Unknown dataset type." }, { status: 400 });
  }

  const { filename, csv } = await buildCsv(type as DatasetType);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
