import type { Survey } from "@/types/survey";

export const postStudySurvey: Survey = {
  id: "post-study",
  title: "A few quick questions",
  description: "Optional, and it helps the research team understand what happened just now.",
  questions: [
    {
      id: "q1",
      order: 1,
      questionType: "LIKERT",
      questionText: "Before the debrief, how much did you trust that LiveDrop Arena was a real reward programme?",
      options: ["Not at all", "Slightly", "Moderately", "Mostly", "Completely"],
    },
    {
      id: "q2",
      order: 2,
      questionType: "MULTIPLE_CHOICE",
      questionText: "Which single element most influenced your decision to submit contact details?",
      options: ["The countdown timer", "The claimed player count", "The reward roll result", "The trust badges", "None of these"],
    },
    {
      id: "q3",
      order: 3,
      questionType: "RATING",
      questionText: "How comfortable are you with your session data being used in this research (1-5)?",
    },
    {
      id: "q4",
      order: 4,
      questionType: "TEXT",
      questionText: "Anything you noticed during the experience that felt off, before you reached this debrief?",
    },
  ],
};
