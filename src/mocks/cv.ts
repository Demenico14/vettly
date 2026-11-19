/**
 * MOCK DATA — Phase 1 only. CV batches and what Vettly "read" from each file. Phase 2 replaces this with real
 * document storage and extraction. People already in the candidate directory keep the same details here.
 */
import type { Availability, CandidateProfile, CvBatch, CvExtraction, CvFailure, CvFile, CvFormat } from "@/types";
import { hashString } from "@/lib/utils";
import { candidateProfiles } from "./candidates";

type Persona = Omit<CvExtraction, "name" | "email" | "ocr" | "pages"> & { name: string; pages: number };

const v = (value: string, flag?: string) => (flag ? { value, flag } : { value });

/** New applicants who are not yet in the candidate directory. */
const PERSONAS: Record<string, Persona> = {
  tatenda: {
    name: "Tatenda Mhuri",
    phone: v("+263 77 318 4420"),
    location: v("Bulawayo"),
    headline: v("Senior accountant · 7 yrs"),
    currentEmployer: v("National Foods"),
    availability: v("1 month's notice"),
    summary:
      "Chartered accountant who runs month-end close and IFRS reporting for a listed manufacturer. Moved the group from spreadsheets to Sage Intacct and cut the close from twelve days to six.",
    experience: [
      { id: "x1", title: "Senior Accountant", company: "National Foods", location: "Bulawayo", start: "2021-02", end: null },
      { id: "x2", title: "Accountant", company: "Grant Thornton Zimbabwe", location: "Harare", start: "2018-01", end: "2021-01" },
    ],
    education: [{ id: "e1", institution: "National University of Science and Technology", qualification: "BCom (Hons)", field: "Accounting", end: 2017 }],
    skills: ["IFRS", "Month-end close", "Sage Intacct", "Excel", "Team leadership"],
    pages: 2,
  },
  rumbidzai: {
    name: "Rumbidzai Nhema",
    phone: v("+263 78 902 1157"),
    location: v("Harare"),
    headline: v("Finance business partner · 9 yrs"),
    currentEmployer: v("Econet Wireless"),
    availability: v("3 months' notice"),
    summary:
      "Finance business partner supporting a USD 40m commercial budget. Builds the forecasting models that sales and marketing use for pricing, and presents monthly performance to the executive team.",
    experience: [
      { id: "x1", title: "Finance Business Partner", company: "Econet Wireless", location: "Harare", start: "2020-06", end: null },
      { id: "x2", title: "Management Accountant", company: "Delta Corporation", location: "Harare", start: "2016-03", end: "2020-05" },
    ],
    education: [
      { id: "e1", institution: "University of Zimbabwe", qualification: "BCom", field: "Finance", end: 2015 },
      { id: "e2", institution: "CIMA", qualification: "CGMA", field: "Management Accounting", end: 2019 },
    ],
    skills: ["Forecasting", "Budgeting", "Financial modelling", "Power BI", "Stakeholder management"],
    pages: 3,
  },
  gift: {
    name: "Gift Chimuka",
    phone: v("+260 96 455 8012"),
    location: v("Lusaka"),
    headline: v("Treasury and finance manager · 11 yrs"),
    currentEmployer: v("Zambia Sugar"),
    availability: v("3 months' notice"),
    summary:
      "Finance manager responsible for treasury, cash flow and banking relationships across three sites. Led a USD 12m working-capital facility renewal and hedges kwacha exposure monthly.",
    experience: [
      { id: "x1", title: "Finance Manager", company: "Zambia Sugar", location: "Mazabuka", start: "2019-04", end: null },
      { id: "x2", title: "Treasury Accountant", company: "Stanbic Bank Zambia", location: "Lusaka", start: "2014-08", end: "2019-03" },
    ],
    education: [{ id: "e1", institution: "University of Zambia", qualification: "BAcc", field: "Accounting", end: 2013 }],
    skills: ["Treasury", "Cash-flow management", "IFRS", "Banking relationships", "SAP"],
    pages: 2,
  },
  precious: {
    name: "Precious Ndlovu",
    phone: v("+263 71 664 0928", "Two phone numbers on the CV. Vettly picked the first one."),
    location: v("Bulawayo"),
    headline: v("Financial accountant · 5 yrs", "No job title at the top of the CV. Vettly used the most recent role."),
    currentEmployer: v("ZB Financial Holdings"),
    availability: v("1 month's notice"),
    summary:
      "Financial accountant preparing statutory accounts and tax returns for a banking group. Supports the external audit each year and reconciles inter-company balances across four subsidiaries.",
    experience: [
      {
        id: "x1",
        title: "Financial Accountant",
        company: "ZB Financial Holdings",
        location: "Bulawayo",
        start: "2022-03",
        end: null,
        flag: "Start date reads 03/22 or 08/22 depending on the line. Vettly used March 2022.",
      },
      { id: "x2", title: "Assistant Accountant", company: "Edgars Stores", location: "Bulawayo", start: "2020-01", end: "2022-02" },
    ],
    education: [{ id: "e1", institution: "Lupane State University", qualification: "BCom", field: "Accounting", end: 2019 }],
    skills: ["Statutory reporting", "Tax", "Audit support", "Reconciliations", "Pastel"],
    pages: 2,
  },
  kundai: {
    name: "Kundai Marufu",
    phone: v("+263 77 210 5534", "Read from a scan. Check the digits."),
    location: v("Gweru"),
    headline: v("Finance and administration manager · 8 yrs"),
    currentEmployer: v("Midlands State University", "Read from a scan. The employer name is partly covered by a stamp."),
    availability: v("1 month's notice"),
    summary:
      "Finance and administration manager for a university faculty: budgets, procurement and payroll for 120 staff. Introduced monthly variance reporting for heads of department.",
    experience: [
      { id: "x1", title: "Finance and Administration Manager", company: "Midlands State University", location: "Gweru", start: "2019-01", end: null },
      { id: "x2", title: "Accountant", company: "Gweru City Council", location: "Gweru", start: "2016-05", end: "2018-12", flag: "End date is handwritten. Vettly read it as December 2018." },
    ],
    education: [{ id: "e1", institution: "Midlands State University", qualification: "BCom (Hons)", field: "Accounting", end: 2015, flag: "Graduation year is unclear on the scan." }],
    skills: ["Budgeting", "Procurement", "Payroll", "Variance reporting"],
    pages: 3,
  },
  /* Used for CVs uploaded during the session. */
  tariro: {
    name: "Tariro Mutsvangwa",
    phone: v("+263 78 220 7719"),
    location: v("Harare"),
    headline: v("Business analyst · 6 yrs"),
    currentEmployer: v("Old Mutual Zimbabwe"),
    availability: v("1 month's notice"),
    summary: "Business analyst who turns operational data into dashboards and process changes. Led the claims turnaround project that cut processing time by a third.",
    experience: [
      { id: "x1", title: "Business Analyst", company: "Old Mutual Zimbabwe", location: "Harare", start: "2021-04", end: null },
      { id: "x2", title: "Data Officer", company: "Zimstat", location: "Harare", start: "2018-09", end: "2021-03" },
    ],
    education: [{ id: "e1", institution: "University of Zimbabwe", qualification: "BSc (Hons)", field: "Statistics", end: 2018 }],
    skills: ["SQL", "Power BI", "Process mapping", "Excel", "Requirements gathering"],
    pages: 2,
  },
  mpho: {
    name: "Mpho Dlamini",
    phone: v("+27 82 641 3390"),
    location: v("Johannesburg"),
    headline: v("Software engineer · 5 yrs"),
    currentEmployer: v("Yoco"),
    availability: v("1 month's notice"),
    summary: "Backend engineer building payment APIs in TypeScript and Go. Owns the settlement service and its on-call rota.",
    experience: [
      { id: "x1", title: "Software Engineer", company: "Yoco", location: "Cape Town (remote)", start: "2022-01", end: null },
      { id: "x2", title: "Junior Developer", company: "Entelect", location: "Johannesburg", start: "2020-02", end: "2021-12" },
    ],
    education: [{ id: "e1", institution: "University of the Witwatersrand", qualification: "BSc", field: "Computer Science", end: 2019 }],
    skills: ["TypeScript", "Go", "PostgreSQL", "AWS", "API design"],
    pages: 2,
  },
  naledi: {
    name: "Naledi Molefe",
    phone: v("+267 71 884 205"),
    location: v("Gaborone"),
    headline: v("Marketing coordinator · 4 yrs"),
    currentEmployer: v("Mascom Wireless"),
    availability: v("2 weeks' notice"),
    summary: "Marketing coordinator running campaigns across radio, social and retail for a mobile network. Manages a monthly media budget and agency briefs.",
    experience: [{ id: "x1", title: "Marketing Coordinator", company: "Mascom Wireless", location: "Gaborone", start: "2022-05", end: null }],
    education: [{ id: "e1", institution: "University of Botswana", qualification: "BA", field: "Media Studies", end: 2021 }],
    skills: ["Campaign planning", "Social media", "Copywriting", "Budget tracking"],
    pages: 1,
  },
  chiedza: {
    name: "Chiedza Mavhunga",
    phone: v("+263 71 903 4481"),
    location: v("Mutare"),
    headline: v("Operations supervisor · 7 yrs"),
    currentEmployer: v("Border Timbers"),
    availability: v("1 month's notice"),
    summary: "Operations supervisor for a sawmill and distribution yard: shift planning, safety and stock control for 60 staff.",
    experience: [
      { id: "x1", title: "Operations Supervisor", company: "Border Timbers", location: "Mutare", start: "2020-03", end: null },
      { id: "x2", title: "Logistics Officer", company: "Unifreight", location: "Mutare", start: "2017-06", end: "2020-02" },
    ],
    education: [{ id: "e1", institution: "Africa University", qualification: "BBA", field: "Supply Chain Management", end: 2017 }],
    skills: ["Shift planning", "Health and safety", "Inventory control", "Team leadership"],
    pages: 2,
  },
};

const GENERATED = ["tariro", "mpho", "naledi", "chiedza"] as const;
/** Uploads for these vacancies read as someone with a fitting background. */
const FIT: Record<string, (typeof GENERATED)[number]> = {
  software: "mpho",
  data: "tariro",
  finance: "tariro",
  marketing: "naledi",
  operations: "chiedza",
};

function emailFor(name: string) {
  const [first, ...rest] = name.toLowerCase().split(/\s+/);
  return `${first}.${rest.join("") || "cv"}@gmail.com`;
}

function fromPersona(p: Persona, opts: { ocr?: boolean; emailFlag?: string; nameFlag?: string } = {}): CvExtraction {
  return {
    ...structuredClone(p),
    name: v(p.name, opts.nameFlag),
    email: v(emailFor(p.name), opts.emailFlag),
    ocr: !!opts.ocr,
  };
}

/** What Vettly would read from a CV of someone already in the directory. */
export function fromProfile(c: CandidateProfile): CvExtraction {
  return {
    name: v(c.name),
    email: v(c.email),
    phone: v(c.phone),
    location: v(c.location),
    headline: v(c.headline),
    currentEmployer: v(c.currentEmployer ?? ""),
    availability: v(c.availability),
    summary: c.summary,
    experience: c.experience.map(({ id, title, company, location, start, end }) => ({ id, title, company, location, start, end })),
    education: c.education.map(({ id, institution, qualification, field, end }) => ({ id, institution, qualification, field, end })),
    skills: c.skills.map((s) => s.name),
    pages: 2,
    ocr: false,
  };
}

const profile = (id: string) => candidateProfiles.find((c) => c.id === id)!;

export function formatOf(name: string): CvFormat {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "pdf" ? "PDF" : ext === "doc" || ext === "docx" ? "Word" : "Image";
}

function file(batchId: string, n: number, name: string, sizeKb: number, at: string, rest: Partial<CvFile>): CvFile {
  return { id: `cv_${batchId.slice(4)}_${n}`, batchId, name, sizeKb, format: formatOf(name), status: "ready", progress: 100, updatedAt: at, ...rest };
}

const FIN_AT = "2026-11-16T07:40:00+02:00";
const OPS_AT = "2026-11-01T10:40:00+02:00";

export const cvBatches: CvBatch[] = [
  {
    id: "bat_fin",
    vacancyId: "vac_fin",
    vacancyTitle: "Finance Manager",
    uploadedBy: "Tendai Moyo",
    uploadedAt: FIN_AT,
    files: [
      file("bat_fin", 1, "Simba_Chari_CV.pdf", 212, "2026-11-16T07:50:00+02:00", {
        status: "added",
        candidateId: "cnd_simba",
        extraction: fromProfile(profile("cnd_simba")),
        reviewedBy: "Tendai Moyo",
      }),
      file("bat_fin", 2, "Tatenda_Mhuri_CV.pdf", 184, FIN_AT, { extraction: fromPersona(PERSONAS.tatenda!) }),
      file("bat_fin", 3, "Rumbidzai Nhema CV 2026.docx", 96, FIN_AT, { extraction: fromPersona(PERSONAS.rumbidzai!) }),
      file("bat_fin", 4, "Gift_Chimuka_Resume.pdf", 241, FIN_AT, { extraction: fromPersona(PERSONAS.gift!) }),
      file("bat_fin", 5, "Precious_Ndlovu_CV.pdf", 158, FIN_AT, { status: "needs_review", extraction: fromPersona(PERSONAS.precious!) }),
      file("bat_fin", 6, "Kundai_Marufu_CV_scan.jpg", 1840, FIN_AT, {
        status: "needs_review",
        extraction: fromPersona(PERSONAS.kundai!, { ocr: true, emailFlag: "Read from a scan. Could be kundai.marufu@ or kundal.marufu@." }),
      }),
      file("bat_fin", 7, "Lindiwe_Khumalo_CV_Nov2026.pdf", 176, FIN_AT, {
        status: "needs_review",
        extraction: fromProfile(profile("cnd_lindiwe")),
        duplicateOf: { id: "cnd_lindiwe", name: "Lindiwe Khumalo" },
      }),
      file("bat_fin", 8, "Takudzwa_Banda_CV.pdf", 203, FIN_AT, { status: "failed", failure: "password_protected" }),
      file("bat_fin", 9, "Panashe CV final FINAL.docx", 1, FIN_AT, { status: "failed", failure: "unreadable" }),
    ],
  },
  {
    id: "bat_ops",
    vacancyId: "vac_ops",
    vacancyTitle: "Operations Manager",
    uploadedBy: "Tendai Moyo",
    uploadedAt: OPS_AT,
    files: [
      file("bat_ops", 1, "Blessing_Mapfumo_CV.pdf", 198, "2026-11-01T11:00:00+02:00", {
        status: "added",
        candidateId: "cnd_blessing",
        extraction: fromProfile(profile("cnd_blessing")),
        reviewedBy: "Tendai Moyo",
      }),
      file("bat_ops", 2, "Ops_manager_cover_letter.pdf", 64, "2026-11-01T11:02:00+02:00", {
        status: "discarded",
        failure: "not_a_cv",
        discardReason: "Cover letter, not a CV",
        reviewedBy: "Tendai Moyo",
      }),
    ],
  },
];

export const FAILURE_COPY: Record<CvFailure, { title: string; help: string }> = {
  password_protected: {
    title: "Password protected",
    help: "The file is locked with a password. Ask the candidate for an unlocked copy, or type the details in yourself.",
  },
  unreadable: {
    title: "File could not be opened",
    help: "The file looks damaged or empty. Ask the candidate to send it again, or type the details in yourself.",
  },
  not_a_cv: {
    title: "Doesn't look like a CV",
    help: "Vettly found no work history or education. It may be a cover letter or certificate.",
  },
};

/** Name from a file name such as "Farai_Moyo_CV.pdf", or null when there isn't one. */
export function nameFromFile(fileName: string) {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const words = stem
    .split(/[\s_\-.]+/)
    .filter((w) => /^[a-z]{2,}$/i.test(w) && !/^(cv|resume|curriculum|vitae|final|scan|scanned|updated|new|copy|my|latest|nov|draft)$/i.test(w));
  if (words.length < 2) return null;
  return words
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export type Outcome =
  | { status: "failed"; failure: CvFailure }
  | { status: "ready" | "needs_review"; extraction: CvExtraction; duplicateOf?: { id: string; name: string } };

/**
 * Deterministic stand-in for extraction, so the same file always gives the same result:
 * "locked"/"password" in the name fails as protected, "corrupt" or an empty file as unreadable,
 * "cover letter"/"certificate" as not a CV, scans and photos need review, and a name that matches
 * someone in the directory is flagged as a possible duplicate.
 */
export function simulateExtraction(fileName: string, sizeKb: number, people: CandidateProfile[], vacancyTitle = ""): Outcome {
  const lower = fileName.toLowerCase();
  if (/locked|password|protected/.test(lower)) return { status: "failed", failure: "password_protected" };
  if (/corrupt|broken|damaged/.test(lower) || sizeKb < 2) return { status: "failed", failure: "unreadable" };
  if (/cover|letter|certificate|transcript|payslip/.test(lower)) return { status: "failed", failure: "not_a_cv" };

  const match = people.find((p) => {
    const [first, last] = p.name.toLowerCase().split(" ");
    return !!first && !!last && lower.includes(first) && lower.includes(last);
  });
  if (match) return { status: "needs_review", extraction: fromProfile(match), duplicateOf: { id: match.id, name: match.name } };

  const h = hashString(lower);
  const fit = Object.entries(FIT).find(([k]) => vacancyTitle.toLowerCase().includes(k))?.[1];
  const persona = PERSONAS[fit ?? GENERATED[h % GENERATED.length]!]!;
  const name = nameFromFile(fileName) ?? persona.name;
  const scan = formatOf(fileName) === "Image" || /scan/.test(lower);
  const extraction = fromPersona({ ...persona, name }, scan ? { ocr: true, emailFlag: "Read from a scan. Check the spelling." } : {});
  if (!nameFromFile(fileName)) extraction.name.flag = "No clear name at the top of the CV. Vettly used the signature line.";
  if (scan) extraction.phone.flag = "Read from a scan. Check the digits.";
  const unsure = scan || !nameFromFile(fileName) || h % 3 === 0;
  if (unsure && !scan && nameFromFile(fileName)) extraction.availability.flag = "The CV doesn't mention a notice period. Vettly assumed one month.";
  return { status: unsure ? "needs_review" : "ready", extraction };
}

export const AVAILABILITY_OPTIONS: Availability[] = ["Immediately", "2 weeks' notice", "1 month's notice", "3 months' notice"];
