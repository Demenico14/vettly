/** Shared interview vocabulary. */
export const RATING_ANCHORS = [
  { value: 1, label: "Little or no evidence", hint: "Examples were vague, hypothetical or contradicted the requirement." },
  { value: 2, label: "Some evidence, with gaps", hint: "Relevant experience, but limited depth, scope or ownership." },
  { value: 3, label: "Meets the requirement", hint: "Clear, specific examples at the level the role needs." },
  { value: 4, label: "Strong evidence", hint: "Repeated, specific examples beyond the role's level." },
  { value: 5, label: "Exceptional", hint: "Outstanding examples with measurable results others learned from." },
] as const;
