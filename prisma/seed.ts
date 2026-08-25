import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptContact } from "../src/lib/crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const researcher = await prisma.user.upsert({
    where: { email: "researcher@example.edu" },
    update: {},
    create: {
      supabaseId: "seed-researcher-0001",
      name: "M. Rahman",
      email: "researcher@example.edu",
      role: "RESEARCHER",
    },
  });

  const streamerUser1 = await prisma.user.upsert({
    where: { email: "rafiq@example.com" },
    update: {},
    create: {
      supabaseId: "seed-streamer-0001",
      name: "Rafiq",
      email: "rafiq@example.com",
      role: "STREAMER",
    },
  });

  const streamerUser2 = await prisma.user.upsert({
    where: { email: "nova@example.com" },
    update: {},
    create: {
      supabaseId: "seed-streamer-0002",
      name: "Nova",
      email: "nova@example.com",
      role: "STREAMER",
    },
  });

  const streamer1 = await prisma.streamer.upsert({
    where: { userId: streamerUser1.id },
    update: {},
    create: {
      userId: streamerUser1.id,
      displayName: "RafiqPlaysBD",
      platform: "Facebook Gaming",
      channelUrl: "https://facebook.com/rafiqplaysbd",
      category: "Mobile Battle Royale",
      status: "ACTIVE",
    },
  });

  const streamer2 = await prisma.streamer.upsert({
    where: { userId: streamerUser2.id },
    update: {},
    create: {
      userId: streamerUser2.id,
      displayName: "NovaTacticalFPS",
      platform: "YouTube",
      channelUrl: "https://youtube.com/@novatacticalfps",
      category: "Tactical FPS",
      status: "ACTIVE",
    },
  });

  const experiment = await prisma.experiment.create({
    data: {
      title: "Persuasion Cues in Viewer Reward Recruitment",
      description:
        "Studies whether urgency framing, social proof, and authority badges independently affect a viewer's willingness to disclose contact information in a livestream reward funnel.",
      objective: "Identify which individual persuasion element most strongly predicts contact disclosure.",
      status: "ACTIVE",
      startDate: new Date("2026-07-01"),
      ethicsApprovalRef: "IRB-2026-0417",
      researcherId: researcher.id,
      streamers: {
        create: [{ streamerId: streamer1.id }, { streamerId: streamer2.id }],
      },
      conditions: {
        create: [
          { name: "Control (no cues)", urgencyEnabled: false, socialProofEnabled: false, authorityBadgesEnabled: false, rewardRarity: "COMMON", contactRequirement: "OPTIONAL" },
          { name: "Urgency only", urgencyEnabled: true, socialProofEnabled: false, authorityBadgesEnabled: false, rewardRarity: "COMMON", contactRequirement: "OPTIONAL" },
          { name: "Social proof only", urgencyEnabled: false, socialProofEnabled: true, authorityBadgesEnabled: false, rewardRarity: "COMMON", contactRequirement: "OPTIONAL" },
          { name: "Full stimulus (all cues)", urgencyEnabled: true, socialProofEnabled: true, authorityBadgesEnabled: true, rewardRarity: "EXCEPTIONAL", contactRequirement: "REQUIRED" },
        ],
      },
      surveys: {
        create: [
          {
            title: "A few quick questions",
            description: "Optional, and it helps the research team understand what happened just now.",
            questions: {
              create: [
                { order: 1, questionType: "LIKERT", questionText: "Before the debrief, how much did you trust that LiveDrop Arena was a real reward programme?", options: ["Not at all", "Slightly", "Moderately", "Mostly", "Completely"] },
                { order: 2, questionType: "MULTIPLE_CHOICE", questionText: "Which single element most influenced your decision to submit contact details?", options: ["The countdown timer", "The claimed player count", "The reward roll result", "The trust badges", "None of these"] },
                { order: 3, questionType: "RATING", questionText: "How comfortable are you with your session data being used in this research (1-5)?" },
                { order: 4, questionType: "TEXT", questionText: "Anything you noticed during the experience that felt off, before you reached this debrief?" },
              ],
            },
          },
        ],
      },
      trackingLinks: {
        create: [
          { uniqueCode: "RFQ-8KX2", streamerId: streamer1.id },
          { uniqueCode: "NVA-3PL9", streamerId: streamer2.id },
        ],
      },
    },
    include: { conditions: true, trackingLinks: true, surveys: true },
  });

  await prisma.experiment.create({
    data: {
      title: "Reward Rarity and Trust Perception (Pilot)",
      description: "Pilot study on whether the rarity tier shown at the reward reveal changes self-reported trust in the event's legitimacy.",
      objective: "Pilot the rarity manipulation ahead of a full factorial follow-up.",
      status: "DRAFT",
      startDate: new Date("2026-09-01"),
      researcherId: researcher.id,
    },
  });

  const condition = experiment.conditions[0];
  const link = experiment.trackingLinks[0];
  const survey = experiment.surveys[0];

  for (let i = 0; i < 20; i++) {
    const submitted = i % 3 !== 0;
    const participant = await prisma.participant.create({
      data: {
        experimentId: experiment.id,
        conditionId: condition.id,
        trackingLinkId: link.id,
        anonymousCode: `P-${1000 + i}`,
        consentStatus: "GRANTED",
        consent: { create: { consentGiven: true, consentVersion: "1.0" } },
        events: {
          create: [
            { type: "PAGE_VIEW" },
            { type: "SPIN_CLICKED" },
            ...(submitted ? [{ type: "MODAL_OPENED" as const }, { type: "SUBMITTED" as const }] : [{ type: "ABANDONED" as const }]),
          ],
        },
        ...(submitted
          ? {
              contact: {
                create: {
                  encryptedValue: encryptContact(`viewer${i}@example.com`),
                  streamNickname: `Viewer${i}`,
                  favouriteGameType: "Mobile Battle Royale",
                  livestreamFrequency: "Weekly livestream viewer",
                },
              },
              debrief: { create: { explanationShown: true, permissionGiven: i % 4 !== 0 } },
            }
          : {}),
      },
    });

    if (submitted) {
      await prisma.response.create({
        data: {
          surveyId: survey.id,
          participantId: participant.id,
          answers: {
            q1: ["Not at all", "Slightly", "Moderately", "Mostly", "Completely"][i % 5],
            q3: (i % 5) + 1,
          },
        },
      });
    }
  }

  console.log(`Seeded experiment ${experiment.id} with ${experiment.trackingLinks.length} tracking links.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
