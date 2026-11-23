import { beforeEach, describe, expect, it, vi } from "vitest";

// Gemma's replies are faked: these tests are about the checks on what comes back.
const reply = vi.hoisted(() => ({ text: null as string | null }));
vi.mock("@/server/ai/local", async (orig) => ({ ...(await orig<object>()), write: async () => reply.text }));

const { writeWithModel, questionsWithModel } = await import("@/server/engine/writing");
const input = { title: "Payroll Officer", department: "Finance", summary: "We need a payroll officer to run the monthly payroll.", responsibilities: [] };

beforeEach(() => {
  reply.text = null;
});

describe("job description help", () => {
  it("returns a checked draft", async () => {
    reply.text = JSON.stringify({ summary: "You will run the monthly payroll for 300 staff and answer their pay questions.", responsibilities: ["Run the monthly payroll accurately and on time", "Answer staff questions about pay and deductions", "Reconcile payroll with the general ledger"] });
    expect(await writeWithModel("draft", input)).toMatchObject({ responsibilities: expect.arrayContaining(["Run the monthly payroll accurately and on time"]) });
  });

  it("rejects placeholders, invented pay and too few responsibilities", async () => {
    reply.text = JSON.stringify({ summary: "Join [Company Name] as our payroll officer and help run the monthly payroll.", responsibilities: ["Run payroll each month", "Answer pay queries from staff", "Reconcile payroll"] });
    expect(await writeWithModel("draft", input)).toBeNull();
    reply.text = JSON.stringify({ summary: "You will run payroll for a salary of US$1,200 per month in our finance team.", responsibilities: ["Run payroll each month", "Answer pay queries from staff", "Reconcile payroll"] });
    expect(await writeWithModel("draft", input)).toBeNull();
    reply.text = JSON.stringify({ summary: "You will run the monthly payroll for 300 staff in the finance team.", responsibilities: ["Run payroll"] });
    expect(await writeWithModel("draft", input)).toBeNull();
  });

  it("adds the welcome line to inclusive rewrites that leave it out", async () => {
    reply.text = JSON.stringify({ summary: "We are looking for a payroll officer to run the monthly payroll." });
    const r = await writeWithModel("inclusive", input);
    expect(r?.summary).toMatch(/We welcome applications from people of all backgrounds/);
  });

  it("returns nothing when the model isn't running, so the templates are used", async () => {
    expect(await writeWithModel("draft", input)).toBeNull();
  });
});

describe("interview questions", () => {
  it("keeps fair questions and drops ones about protected topics", async () => {
    reply.text = JSON.stringify({
      questions: [
        { requirement: "Payroll processing", question: "Tell us about a time you found and fixed an error in a payroll run. What did you do?", lookFor: ["Checks before paying", "Owns the fix"] },
        { requirement: "Team leadership", question: "How old are you, and do you have children who might affect your hours?", lookFor: ["Availability"] },
      ],
    });
    const qs = await questionsWithModel("Payroll Officer", ["Payroll processing", "Team leadership"]);
    expect(qs?.map((q) => q.requirement)).toEqual(["Payroll processing"]);
  });
});
