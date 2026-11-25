/**
 * Accounting fundamentals: 54 original questions, eighteen for each of the test's scales (IFRS reporting,
 * group accounts, tax and compliance), plus two practice. Calculations give every rate they need in the
 * question, so answers don't depend on rates that change. Options are shuffled with a fixed seed.
 */
import { type BankItem, authored, rng } from "./util";

type Q = [1 | 2 | 3, string, string, string[], string];

const IFRS: Q[] = [
  [1, "Under IFRS 16, how does a lessee show most leases in its statement of financial position?", "A right-of-use asset and a lease liability", ["As an expense only", "As a note, not on the balance sheet", "As an intangible asset"], "IFRS 16 brings leases onto the balance sheet."],
  [1, "IAS 2 measures inventory at:", "The lower of cost and net realisable value", ["Selling price", "Replacement cost", "Cost plus a margin"], ""],
  [1, "Under IFRS 15, revenue is recognised when:", "Control of the goods or services passes to the customer", ["Cash is received", "The invoice is printed", "The contract is signed"], ""],
  [2, "Which cost formula does IAS 2 not allow?", "LIFO (last in, first out)", ["FIFO (first in, first out)", "Weighted average cost", "Specific identification"], ""],
  [2, "When is a provision recognised under IAS 37?", "There is a present obligation from a past event, an outflow is probable and it can be reliably estimated", ["Management expects a loss next year", "A customer threatens to sue, however unlikely", "The board wants to smooth profits"], ""],
  [2, "A court case is settled after the year end, confirming an obligation that existed at the year end. Under IAS 10 this is:", "An adjusting event", ["A non-adjusting event", "A contingent asset", "Ignored"], ""],
  [2, "Expected credit losses on trade receivables are measured under:", "IFRS 9", ["IAS 2", "IFRS 15", "IAS 16"], ""],
  [1, "How is purchased goodwill treated after acquisition?", "Not amortised, but tested for impairment at least once a year", ["Amortised over five years", "Written off immediately", "Revalued upwards each year"], ""],
  [1, "Under IAS 38, research costs are:", "Expensed as incurred", ["Capitalised", "Capitalised only if successful", "Deferred to the next year"], ""],
  [2, "An entity's functional currency (IAS 21) is:", "The currency of the main economic environment it operates in", ["Always US dollars", "The currency its owners use", "The strongest currency it trades in"], ""],
  [2, "Which standard deals with reporting in a hyperinflationary economy?", "IAS 29", ["IAS 21", "IFRS 9", "IAS 33"], ""],
  [1, "A machine costs USD 50,000, has a residual value of USD 5,000 and a nine-year life. What is the straight-line depreciation a year?", "USD 5,000", ["USD 5,556", "USD 4,500", "USD 6,000"], "(50,000 − 5,000) ÷ 9 = 5,000."],
  [1, "Stock cost USD 12,000 and can now be sold for USD 10,500 after selling costs. At what amount is it carried?", "USD 10,500", ["USD 12,000", "USD 1,500", "USD 22,500"], "Lower of cost and net realisable value."],
  [2, "Rent of USD 12,000 for twelve months is paid on 1 October. At a 31 December year end, how much is a prepayment?", "USD 9,000", ["USD 3,000", "USD 12,000", "USD 0"], "Nine months relate to next year."],
  [1, "Under the accrual basis, expenses are recognised when:", "They are incurred", ["They are paid", "The invoice is filed", "The year ends"], ""],
  [2, "A possible obligation whose existence depends on uncertain future events is usually:", "Disclosed as a contingent liability, not recognised", ["Recognised as a provision", "Ignored completely", "Shown as an asset"], ""],
  [3, "Under IAS 16, when does depreciation of a new asset begin?", "When it is available for use", ["When it is paid for", "At the start of the next financial year", "When it is first used at full capacity"], ""],
  [3, "Development costs can be capitalised under IAS 38 when:", "Technical feasibility, intention, ability to use or sell, probable benefits, resources and reliable measurement are all shown", ["The project has started", "The board approves the budget", "A patent application is filed"], ""],
];

const GROUP: Q[] = [
  [1, "An entity the parent controls is:", "A subsidiary, consolidated in full", ["An associate, equity accounted", "A joint operation", "A simple investment at cost"], ""],
  [1, "A holding that gives significant influence (often 20–50%) is usually:", "An associate, using the equity method", ["A subsidiary", "Consolidated in full", "Ignored"], ""],
  [2, "Consideration USD 800k, non-controlling interest at fair value USD 150k, fair value of net assets USD 700k. What is goodwill?", "USD 250k", ["USD 100k", "USD 950k", "USD 50k"], "800 + 150 − 700 = 250."],
  [1, "On consolidation, sales between group companies are:", "Eliminated", ["Added together", "Shown separately as income", "Taxed again"], ""],
  [3, "The parent sold goods costing USD 100k to its subsidiary for USD 120k. Half are still in the subsidiary's stock at year end. What is the unrealised profit?", "USD 10k", ["USD 20k", "USD 60k", "USD 0"], "Profit 20k; half unsold, so 10k."],
  [2, "A subsidiary made a profit of USD 200k. Non-controlling interests own 25%. What is their share?", "USD 50k", ["USD 150k", "USD 25k", "USD 200k"], ""],
  [2, "Under the equity method, an investment in an associate starts at:", "Cost, then adjusted for the investor's share of post-acquisition results", ["Fair value, revalued every year", "Nil", "The associate's net assets"], ""],
  [2, "In a joint arrangement where the parties have rights to the net assets, the arrangement is:", "A joint venture, using the equity method", ["A joint operation", "A subsidiary", "A financial asset"], ""],
  [1, "A loan from the parent to its subsidiary appears in the group accounts as:", "Nothing: both sides are eliminated", ["An asset and a liability", "Income", "Equity"], ""],
  [3, "After reassessing, an acquirer still pays less than the fair value of net assets acquired. The difference is:", "Recognised as a gain in profit or loss", ["Added to goodwill", "Deferred over five years", "Credited to equity"], ""],
  [2, "An associate made a profit of USD 400k. The investor holds 30%. What is the investor's share?", "USD 120k", ["USD 400k", "USD 280k", "USD 30k"], ""],
  [2, "A dividend paid by a subsidiary to its parent is, in the group accounts:", "Eliminated", ["Group income", "A group expense", "Added to goodwill"], ""],
  [2, "At acquisition, the subsidiary's identifiable assets and liabilities are measured at:", "Fair value", ["Book value", "Historical cost", "Tax value"], ""],
  [3, "Under IFRS 3, legal fees for an acquisition are:", "Expensed", ["Added to goodwill", "Added to the cost of the investment in the group accounts", "Deducted from equity"], ""],
  [3, "If a subsidiary's reporting date differs from the parent's, IFRS 10 allows a difference of no more than:", "Three months, with adjustments for significant events", ["One month", "Six months", "Any period"], ""],
  [3, "A foreign subsidiary's assets and liabilities are translated at:", "The closing rate, with differences in other comprehensive income", ["The historical rate", "The average rate, with differences in profit", "The rate on acquisition"], ""],
  [3, "When a parent loses control of a subsidiary but keeps a stake, the retained interest is:", "Remeasured to fair value", ["Kept at its old carrying amount", "Written off", "Treated as goodwill"], ""],
  [2, "At acquisition, non-controlling interest may be measured at:", "Fair value or its share of identifiable net assets", ["Only fair value", "Only book value", "Nil"], ""],
];

const TAX: Q[] = [
  [1, "A price of USD 1,150 includes VAT at 15%. How much is VAT?", "USD 150", ["USD 172.50", "USD 115", "USD 135"], "1,150 × 15 ÷ 115 = 150."],
  [1, "Output VAT is USD 9,000 and input VAT is USD 6,500. How much VAT is payable?", "USD 2,500", ["USD 15,500", "USD 9,000", "USD 6,500"], ""],
  [1, "Input VAT can generally be claimed on purchases used to make:", "Taxable supplies", ["Exempt supplies", "Private purchases", "Gifts to staff"], ""],
  [2, "Deferred tax (IAS 12) arises from:", "Temporary differences between an asset's carrying amount and its tax base", ["Late tax payments", "Tax penalties", "Dividends paid"], ""],
  [2, "Taxable profit is USD 200,000. Corporate tax is 24% and a levy of 3% is charged on the tax. What is the total?", "USD 49,440", ["USD 48,000", "USD 54,000", "USD 6,000"], "48,000 × 1.03 = 49,440."],
  [1, "Withholding tax is:", "Deducted at source by the payer", ["Paid by the recipient at year end", "A tax on stock", "Refunded every month"], ""],
  [1, "Under PAYE, who pays the tax to the revenue authority?", "The employer, from employees' pay", ["Each employee directly", "The bank", "The pension fund"], ""],
  [2, "What is the main difference between zero-rated and exempt supplies?", "Zero-rated supplies allow input VAT to be claimed; exempt supplies don't", ["Exempt supplies are taxed at 15%", "There is no difference", "Zero-rated supplies can't be sold"], ""],
  [1, "Which must a valid tax invoice show?", "The supplier's VAT registration number", ["The buyer's bank balance", "The supplier's profit margin", "The buyer's tax return"], ""],
  [2, "Why must source documents be kept?", "To support tax returns and accounts if they are audited", ["To reduce tax automatically", "Because invoices expire", "To share with competitors"], ""],
  [2, "Equipment costing USD 40,000 qualifies for a wear-and-tear allowance of 25% a year, straight line. What is the allowance a year?", "USD 10,000", ["USD 4,000", "USD 25,000", "USD 7,500"], ""],
  [1, "Paying tax late usually leads to:", "Penalties and interest", ["A discount", "No consequence", "A refund"], ""],
  [3, "Current tax on an item recognised in other comprehensive income is recognised in:", "Other comprehensive income", ["Profit or loss", "Retained earnings only", "A note only"], ""],
  [3, "A deferred tax asset for unused tax losses is recognised only when:", "Future taxable profits are probable", ["The losses are large", "The auditor agrees", "Tax rates are falling"], ""],
  [2, "Provisional tax is:", "Paid in instalments during the year, based on estimated tax", ["Paid only after the year's return", "A tax on provisions", "Optional"], ""],
  [2, "An employer gives a manager a car that may also be used privately. This is:", "A taxable benefit", ["Tax-free", "A business expense of the manager", "Exempt if the car is old"], ""],
  [3, "Transactions between related companies should be priced:", "At arm's length, as between independent parties", ["At cost", "At whatever the group chooses", "At nil"], ""],
  [3, "When a business buys services from a non-resident supplier, VAT on imported services is usually accounted for by:", "The recipient", ["The foreign supplier", "Nobody", "The bank making the payment"], ""],
];

function build(): BankItem[] {
  const r = rng(1357);
  const make = (qs: Q[], scale: string, prefix: number) =>
    qs.map(([d, prompt, correct, wrong, explanation], i) => authored(r, `acc_${String(prefix + i + 1).padStart(2, "0")}`, "accounting", d, prompt, correct, wrong, { scale, ...(explanation ? { explanation } : {}) }));
  return [
    ...make(IFRS, "acc_ifrs", 0),
    ...make(GROUP, "acc_group", 18),
    ...make(TAX, "acc_tax", 36),
    authored(r, "acc_p1", "accounting", 1, "Which is an asset?", "Cash at bank", ["A loan payable", "Wages owed to staff", "Share capital"], { practice: true, scale: "acc_ifrs" }),
    authored(r, "acc_p2", "accounting", 1, "Sales of USD 500 are made on credit. Which balance rises?", "Trade receivables", ["Trade payables", "Cash", "Inventory"], { practice: true, scale: "acc_ifrs" }),
  ];
}

export const accountingBank = build();
