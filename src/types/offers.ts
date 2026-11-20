/** Offers and hiring (Module 11). Seeded records are fictional. */

export type OfferStatus = "draft" | "pending_approval" | "approved" | "sent" | "viewed" | "accepted" | "declined" | "countered" | "withdrawn" | "expired";
export type ApprovalStatus = "waiting" | "pending" | "approved" | "rejected";
export type PayPeriod = "month" | "year";
export type ContractType = "Permanent" | "Fixed term (12 months)" | "Fixed term (24 months)";

export interface Allowance {
  name: string;
  amount: number;
}

export interface OfferTerms {
  jobTitle: string;
  department: string;
  location: string;
  workMode: string;
  reportsTo: string;
  contractType: ContractType;
  startDate: string;
  probationMonths: number;
  noticePeriodMonths: number;
  currency: "USD" | "ZiG" | "ZAR" | "BWP" | "ZMW";
  baseSalary: number;
  payPeriod: PayPeriod;
  allowances: Allowance[];
  benefits: string[];
  /** Days the candidate has to respond. */
  validDays: number;
  personalNote: string;
}

export interface Approval {
  step: number;
  approverName: string;
  role: string;
  /** Why this approver is in the chain. */
  reason: string;
  status: ApprovalStatus;
  at?: string;
  note?: string;
}

export interface CandidateResponse {
  outcome: "accepted" | "declined" | "countered";
  at: string;
  /** What the candidate said, recorded by HR. */
  note: string;
  /** For counter-offers. */
  requestedSalary?: number;
  requestedStartDate?: string;
  declineReason?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  phase: "before_hire" | "before_start";
  required: boolean;
  done: boolean;
  doneBy?: string;
  doneAt?: string;
  note?: string;
}

export interface OfferEvent {
  at: string;
  by: string;
  text: string;
}

export interface Offer {
  id: string;
  version: number;
  candidateId: string;
  candidateName: string;
  applicationId: string;
  vacancyId: string;
  vacancyTitle: string;
  status: OfferStatus;
  terms: OfferTerms;
  approvals: Approval[];
  sentAt: string | null;
  viewedAt: string | null;
  expiresAt: string | null;
  response: CandidateResponse | null;
  withdrawnReason?: string;
  checklist: ChecklistItem[];
  hiredAt: string | null;
  hiredBy?: string;
  /** Earlier versions' terms, newest last, when the offer was revised. */
  previous: { version: number; baseSalary: number; startDate: string; status: OfferStatus; at: string }[];
  createdBy: string;
  createdAt: string;
  history: OfferEvent[];
  isMock: true;
}
