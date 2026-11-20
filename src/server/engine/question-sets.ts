import "server-only";
import type { Question, QuestionSet } from "@/types/interviews";
import type { Vacancy } from "@/types";

const q = (id: string, text: string, followUps: string[], lookFor: string[], redFlags: string[]): Question => ({ id, text, followUps, lookFor, redFlags });

/** The generic screening call, available for every vacancy. */
export const SCREENING_SET: QuestionSet = 
{
    id: "qs_screen",
    name: "Screening call",
    kind: "screening_call",
    vacancyId: null,
    description: "A 20–30 minute call to confirm motivation, practicalities and communication before a full interview.",
    competencies: [
      {
        id: "c_motivation",
        name: "Motivation for the role",
        description: "Why this role, at this organisation, now.",
        questions: [
          q("q_mot1", "What attracted you to this role, and what would make you leave your current one?", ["What would your ideal next 12 months look like?"], ["Specific link between the role and their goals", "Has researched the organisation"], ["Only salary or title", "Can't say what they know about us"]),
        ],
      },
      {
        id: "c_practical",
        name: "Practicalities",
        description: "Notice period, location, salary expectations and right to work.",
        questions: [
          q("q_prac1", "What is your notice period, and what salary range are you looking for?", ["Is the location and work pattern workable for you?"], ["Clear, realistic answers"], ["Expectations far outside the range with no flexibility"]),
        ],
      },
      {
        id: "c_comm",
        name: "Communication",
        description: "Clear, structured spoken communication.",
        questions: [q("q_comm1", "Talk me through your current role in two minutes.", ["What's the part of it you're proudest of?"], ["Structured, concise, specific"], ["Rambling, unable to summarise"])],
      },
    ],
  };

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** A structured interview built from a vacancy's requirements: one competency per requirement, essentials first. */
export function vacancySet(v: Vacancy): QuestionSet {
  const reqs = [...v.requirements].sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "essential" ? -1 : 1)).slice(0, 8);
  return {
    id: `qs_vac_${v.id}`,
    name: `${v.title} structured interview`,
    kind: "first_interview",
    vacancyId: v.id,
    description: `One competency per requirement of the ${v.title} vacancy, essential requirements first. Ask for specific past examples.`,
    competencies: reqs.map((r, i) => ({
      id: `c_${r.id}`,
      name: r.text.length > 60 ? `${r.text.slice(0, 57)}…` : r.text,
      description: `${r.priority === "essential" ? "Essential" : "Desirable"} requirement.`,
      requirement: r.text,
      questions: [
        q(
          `q_${r.id}_${i}`,
          r.kind === "experience"
            ? `Walk us through the roles where you built your experience in ${lower(r.text)}. What were you responsible for?`
            : r.kind === "certification" || r.kind === "education"
              ? `Tell us about your ${lower(r.text)}. How have you used it in your work?`
              : `Tell us about a recent time you used ${lower(r.text)}. What did you do, and what was the result?`,
          ["What would you do differently now?", "Who else was involved, and what was your part?"],
          ["A specific, recent example", "Clear personal contribution", "Measurable result"],
          ["Only general or hypothetical answers", "Can't describe their own part"],
        ),
      ],
    })),
  };
}
