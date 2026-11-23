/** Made-up CVs with known answers, for testing local models. Not real people. */
export const CV_SAMPLES = [
  {
    id: "tidy",
    text: `Tatenda Moyo
Senior Accountant
tatenda.moyo@example.com | +263 77 123 4567 | Harare, Zimbabwe

PROFILE
Chartered accountant with nine years in audit and financial reporting for manufacturing and logistics firms.

WORK EXPERIENCE
Senior Accountant, Delta Beverages
March 2020 - Present
Led month-end close for three business units and cut the reporting cycle from ten days to six.

Audit Senior, Ernst & Young Zimbabwe
January 2016 - February 2020
Ran external audits for clients in mining and retail.

EDUCATION
Bachelor of Accountancy (Honours), University of Zimbabwe, 2015

CERTIFICATIONS
ACCA, Association of Chartered Certified Accountants, 2018

SKILLS
IFRS, Sage Evolution, Excel, Power BI, team leadership

Available: one month's notice`,
    expected: {
      name: "Tatenda Moyo",
      email: "tatenda.moyo@example.com",
      phone: "+263 77 123 4567",
      location: "Harare",
      currentEmployer: "Delta Beverages",
      experienceCount: 2,
      educationCount: 1,
      certification: "ACCA",
      skills: ["IFRS", "Power BI"],
    },
  },
  {
    id: "messy",
    text: `CURRICULUM VITAE
NAME: RUDO   CHIKOWERO          CELL: 0712 555 019
EMAIL: rudo.c@example.org        ADDRESS: 14 Fife Avenue, Bulawayo
career objective - looking for a role as a fleet controller where i can grow
EMPLOYMENT HISTORY
2021 to date  ...  Fleet Supervisor  ...  Swift Transport (Pvt) Ltd
   - managed 40 trucks, fuel and tracking (Cartrack)
2017-2021 Dispatch Clerk, Unifreight Africa
QUALIFICATIONS
2016 Diploma in Logistics and Supply Chain - Harare Polytechnic
Class 2 drivers licence
COMPUTER SKILLS: MS Office, Cartrack, SAP (basic)
REFEREES available on request`,
    expected: {
      name: "Rudo Chikowero",
      email: "rudo.c@example.org",
      phone: "0712 555 019",
      location: "Bulawayo",
      currentEmployer: "Swift Transport (Pvt) Ltd",
      experienceCount: 2,
      educationCount: 1,
      certification: "Class 2",
      skills: ["Cartrack", "SAP"],
    },
  },
  {
    id: "skills-first",
    text: `Core skills: Python · SQL · Airflow · dbt · Kubernetes
Languages: English, Shona, Ndebele

Farai Ncube — Data Engineer
Gweru | farai.ncube@example.net | +263 71 900 2233

Experience
• Econet Wireless — Data Engineer (Jun 2022 – present): built the billing data pipeline on Airflow and dbt.
• Cassava Fintech — Junior Data Analyst (Feb 2020 – May 2022): reporting in SQL and Python.

Education
• BSc Computer Science, National University of Science and Technology (NUST), 2019

Certificates
• Google Cloud Professional Data Engineer (2023)`,
    expected: {
      name: "Farai Ncube",
      email: "farai.ncube@example.net",
      phone: "+263 71 900 2233",
      location: "Gweru",
      currentEmployer: "Econet Wireless",
      experienceCount: 2,
      educationCount: 1,
      certification: "Google Cloud Professional Data Engineer",
      skills: ["Python", "Airflow"],
    },
  },
];
