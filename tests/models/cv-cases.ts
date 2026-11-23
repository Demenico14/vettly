/**
 * Made-up CVs with their correct readings, for scoring Vettly's CV reader (tests/models/cv-eval.test.ts).
 * Not real people. Real CVs used for scoring stay outside git, in models/samples/private-cvs.json.
 */
import { CV_SAMPLES } from "../../scripts/models/cv-samples.mjs";

export interface CvCase {
  id: string;
  text: string;
  answer: {
    name: string;
    email: string;
    phone: string;
    /** City or town. */
    location: string;
    /** Newest first. Dates are "YYYY-MM", or "YYYY" when the CV gives only a year; end null means current. */
    jobs: { title: string; company: string; start: string; end: string | null }[];
    /** Words each qualification must contain. */
    education: string[];
    certifications: string[];
    /** Skills that must be found. */
    skills: string[];
  };
}

const sample = (id: string) => CV_SAMPLES.find((s: { id: string }) => s.id === id)!.text as string;

export const CV_CASES: CvCase[] = [
  {
    id: "tidy",
    text: sample("tidy"),
    answer: {
      name: "Tatenda Moyo",
      email: "tatenda.moyo@example.com",
      phone: "+263 77 123 4567",
      location: "Harare",
      jobs: [
        { title: "Senior Accountant", company: "Delta Beverages", start: "2020-03", end: null },
        { title: "Audit Senior", company: "Ernst & Young Zimbabwe", start: "2016-01", end: "2020-02" },
      ],
      education: ["Bachelor of Accountancy"],
      certifications: ["ACCA"],
      skills: ["IFRS", "Power BI", "Sage Evolution"],
    },
  },
  {
    id: "messy",
    text: sample("messy"),
    answer: {
      name: "Rudo Chikowero",
      email: "rudo.c@example.org",
      phone: "0712 555 019",
      location: "Bulawayo",
      jobs: [
        { title: "Fleet Supervisor", company: "Swift Transport", start: "2021", end: null },
        { title: "Dispatch Clerk", company: "Unifreight Africa", start: "2017", end: "2021" },
      ],
      education: ["Diploma in Logistics"],
      certifications: ["Class 2"],
      skills: ["Cartrack", "SAP"],
    },
  },
  {
    id: "skills-first",
    text: sample("skills-first"),
    answer: {
      name: "Farai Ncube",
      email: "farai.ncube@example.net",
      phone: "+263 71 900 2233",
      location: "Gweru",
      jobs: [
        { title: "Data Engineer", company: "Econet Wireless", start: "2022-06", end: null },
        { title: "Junior Data Analyst", company: "Cassava Fintech", start: "2020-02", end: "2022-05" },
      ],
      education: ["BSc Computer Science"],
      certifications: ["Google Cloud Professional Data Engineer"],
      skills: ["Python", "Airflow", "dbt"],
    },
  },
  {
    // The layout of many modern templates: letter-spaced headings, company and dates on one line with the title
    // below, education and certificates in one section, and references full of other people's jobs.
    id: "spaced-headings",
    text: `Nyasha Gumbo
+263-771-555-010 · nyasha.gumbo@example.com · 4 Baines Avenue, Avondale, Harare
linkedin.com/in/nyashagumbo · github.com/ngumbo
P R O F I L E
Results-driven data science graduate with two years of hands-on analytics work in banking and insurance.
S K I L L S
Languages Python · SQL · Java
Data Pandas · Power BI · Tableau · Statistical Modelling
Soft Skills Teamwork · Time Management
P R O F E S S I O N A L E X P E R I E N C E
Old Mutual Zimbabwe Mar 2025 – Present
Junior Data Scientist
Developed churn models for life insurance policies and presented findings to the actuarial team.
CBZ Bank Feb 2024 – Jan 2025
Data Analyst Intern
Built weekly credit-risk dashboards in Power BI and automated loan reports with Python.
E D U C AT I O N & C E R T I F I C AT I O N S
BSc (Hons) Computer Science Aug 2020 – Jul 2024
Midlands State University — Upper Second Class
Cambridge International A Level
Mathematics, Physics & Chemistry
Microsoft Certified: Power BI Data Analyst Associate (PL-300) Sep 2024
Microsoft
Google Data Analytics Certificate Mar 2023
Coursera
R E F E R E N C E S
T. Moyo
Head of Data, CBZ Bank
+263 772 000 111
t.moyo@example.com`,
    answer: {
      name: "Nyasha Gumbo",
      email: "nyasha.gumbo@example.com",
      phone: "+263-771-555-010",
      location: "Harare",
      jobs: [
        { title: "Junior Data Scientist", company: "Old Mutual Zimbabwe", start: "2025-03", end: null },
        { title: "Data Analyst Intern", company: "CBZ Bank", start: "2024-02", end: "2025-01" },
      ],
      education: ["Computer Science", "A Level"],
      certifications: ["PL-300", "Google Data Analytics"],
      skills: ["Python", "Power BI", "Tableau"],
    },
  },
  {
    // A trade CV: personal details block, O Levels, a trade test, dates before the job.
    id: "trade",
    text: `CURRICULUM VITAE
Personal Details
Full Name: Tinashe Dube
Address: 221 Mkoba 12, Gweru
Cell: 0778 123 456
Email: tdube@example.com
Educational Background
2015 – 2018  Mkoba High School  —  5 O Levels including Maths and English
2019 – 2021  Gweru Polytechnic  —  National Certificate in Motor Mechanics
Trade Test
Class One Motor Mechanic Trade Test, Ministry of Higher and Tertiary Education, 2022
Work Experience
Jan 2022 – Present   Motor Mechanic, Zimoco Gweru
Servicing light vehicles and diagnostics with OBD scanners.
Jun 2021 – Dec 2021  Apprentice Mechanic, AA Motors
Skills: engine overhauls, diagnostics, welding, Class 4 driver's licence
Referees
Mr K. Ncube, Workshop Manager, Zimoco — 0772 999 888`,
    answer: {
      name: "Tinashe Dube",
      email: "tdube@example.com",
      phone: "0778 123 456",
      location: "Gweru",
      jobs: [
        { title: "Motor Mechanic", company: "Zimoco", start: "2022-01", end: null },
        { title: "Apprentice Mechanic", company: "AA Motors", start: "2021-06", end: "2021-12" },
      ],
      education: ["O Level", "Motor Mechanics"],
      certifications: ["Trade Test"],
      skills: ["welding", "diagnostics"],
    },
  },
];
