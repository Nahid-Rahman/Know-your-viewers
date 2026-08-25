export type QuestionType = "MULTIPLE_CHOICE" | "LIKERT" | "RATING" | "TEXT";

export type SurveyQuestion = {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  order: number;
};

export type Survey = {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
};

export type SurveyAnswers = Record<string, string | number>;
