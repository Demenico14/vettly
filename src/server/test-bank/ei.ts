/**
 * Emotional intelligence at work: 56 original statements on a seven-point scale (never to always), fourteen
 * for each of the test's scales: self-awareness, self-management, empathy and relationship management.
 * Keyed + means agreement scores high on the scale.
 */
import type { BankItem } from "./util";

const ITEMS: [string, string, "+" | "-"][] = [
  // Self-awareness
  ["I can tell when my mood is affecting how I work.", "ei_aware", "+"],
  ["I notice the early signs that I'm becoming stressed.", "ei_aware", "+"],
  ["I am surprised by how strongly I react to things.", "ei_aware", "-"],
  ["I know which situations at work tend to frustrate me.", "ei_aware", "+"],
  ["I can name what I'm feeling, not just that I feel bad.", "ei_aware", "+"],
  ["Other people point out feelings in me that I hadn't noticed.", "ei_aware", "-"],
  ["I understand why some tasks drain my energy.", "ei_aware", "+"],
  ["I realise only afterwards that I was upset.", "ei_aware", "-"],
  ["I know how my tone comes across when I'm under pressure.", "ei_aware", "+"],
  ["I can explain the reasons behind my strong reactions.", "ei_aware", "+"],
  ["My feelings seem to come from nowhere.", "ei_aware", "-"],
  ["I am aware of my strengths and limits at work.", "ei_aware", "+"],
  ["I find it hard to describe how I feel.", "ei_aware", "-"],
  ["I reflect on how I handled difficult moments.", "ei_aware", "+"],
  // Self-management
  ["I stay calm when plans change at the last minute.", "ei_manage", "+"],
  ["I say things in anger that I later regret.", "ei_manage", "-"],
  ["I can put a bad morning aside when I meet a customer.", "ei_manage", "+"],
  ["When I'm frustrated, it shows in my emails.", "ei_manage", "-"],
  ["I take a moment before responding to criticism.", "ei_manage", "+"],
  ["Setbacks put me off for days.", "ei_manage", "-"],
  ["I can keep working steadily under a tight deadline.", "ei_manage", "+"],
  ["I find it hard to calm down after a disagreement.", "ei_manage", "-"],
  ["I can lift my own mood when work gets dull.", "ei_manage", "+"],
  ["Pressure makes me snap at people.", "ei_manage", "-"],
  ["I recover quickly when something goes wrong.", "ei_manage", "+"],
  ["I let small irritations build up.", "ei_manage", "-"],
  ["I stay polite even when I feel I've been treated unfairly.", "ei_manage", "+"],
  ["I can stop worrying about work when I get home.", "ei_manage", "+"],
  // Empathy
  ["I notice when a colleague is having a hard day.", "ei_empathy", "+"],
  ["I can tell how someone feels from their tone, not just their words.", "ei_empathy", "+"],
  ["Other people's feelings are not my concern at work.", "ei_empathy", "-"],
  ["I try to see a complaint from the customer's side.", "ei_empathy", "+"],
  ["I miss signs that someone is uncomfortable.", "ei_empathy", "-"],
  ["I can sense tension in a meeting before anyone mentions it.", "ei_empathy", "+"],
  ["I find it hard to understand why people get upset.", "ei_empathy", "-"],
  ["I listen fully before giving my view.", "ei_empathy", "+"],
  ["I adjust how I explain things to the person in front of me.", "ei_empathy", "+"],
  ["I interrupt people when I think I know what they mean.", "ei_empathy", "-"],
  ["I can tell when someone agrees out loud but isn't convinced.", "ei_empathy", "+"],
  ["I assume people feel the way I would in their position.", "ei_empathy", "-"],
  ["I ask how people are and really want to know.", "ei_empathy", "+"],
  ["I notice when someone new feels left out.", "ei_empathy", "+"],
  // Relationship management
  ["I can disagree with someone without damaging the relationship.", "ei_relate", "+"],
  ["I avoid difficult conversations for as long as I can.", "ei_relate", "-"],
  ["I help calm things down when a team argument flares up.", "ei_relate", "+"],
  ["I give feedback in a way people can accept.", "ei_relate", "+"],
  ["People find me hard to approach.", "ei_relate", "-"],
  ["I build good working relationships with new colleagues quickly.", "ei_relate", "+"],
  ["I hold grudges after a falling-out.", "ei_relate", "-"],
  ["I can persuade people without pressuring them.", "ei_relate", "+"],
  ["I let conflicts drag on rather than address them.", "ei_relate", "-"],
  ["I thank people for their help, even for small things.", "ei_relate", "+"],
  ["I can deliver unwelcome news kindly and clearly.", "ei_relate", "+"],
  ["I struggle to repair a relationship after a mistake.", "ei_relate", "-"],
  ["I bring people with different views together.", "ei_relate", "+"],
  ["I keep in touch with colleagues I may need to work with again.", "ei_relate", "+"],
];

export const eiBank: BankItem[] = [
  ...ITEMS.map(([prompt, scale, keyed], i): BankItem => ({ id: `ei_${String(i + 1).padStart(2, "0")}`, testId: "ei", practice: false, scale, keyed, prompt, difficulty: 1, source: "original" })),
  { id: "ei_p1", testId: "ei", practice: true, prompt: "I enjoy music while I work.", difficulty: 1, source: "original" },
  { id: "ei_p2", testId: "ei", practice: true, prompt: "I like to try new food.", difficulty: 1, source: "original" },
];
