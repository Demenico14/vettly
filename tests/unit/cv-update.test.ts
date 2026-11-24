import { describe, expect, it } from "vitest";
import type { CandidateProfile, CvExtraction } from "@/types";
import { changesFromCv, fieldsFromCv } from "@/lib/cv-update";

const v = (value: string) => ({ value });
const profile = {
  headline: "linkedin.com/in/jane · github.com/jane",
  location: "Harare",
  summary: "Old summary.",
  currentEmployer: null,
  experience: [{ id: "x1", title: "Intern", company: "Strategic Information System", location: "", start: "2024-11", end: "2025-11", bullets: [] }],
  education: [{ id: "e1", institution: "University of Zimbabwe", qualification: "BSc (Hons) AI & ML", field: "", start: 2023, end: 2026 }],
  certifications: [],
  skills: [{ name: "Python", level: "Expert" as const }],
  topSkills: ["Python"],
  linkedin: "https://linkedin.com/in/jane",
  github: null,
  website: null,
  notes: [{ id: "n1", body: "Strong interview", by: "HR", at: "2026-11-01" }],
} as unknown as CandidateProfile;

const cv = {
  name: v("Jane Moyo"), email: v("jane@example.com"), phone: v(""), location: v("Harare"), headline: v("Software Engineering Intern"),
  currentEmployer: v(""), availability: v(""), summary: "New summary from the latest CV.",
  experience: [{ id: "x1", title: "Software Engineering Intern", company: "Strategic Information Systems", location: "", start: "2024-11", end: "2025-11", bullets: ["Built a POS app"] }],
  education: [{ id: "e1", institution: "University of Zimbabwe", qualification: "BSc (Hons) AI & ML", field: "", end: 2026 }],
  certifications: [{ id: "c1", name: "PCAP", issuer: "Cisco Networking Academy", year: 2022 }],
  skills: ["Python", "TensorFlow"], pages: 2, ocr: false,
  links: { linkedin: "https://linkedin.com/in/other", github: "https://github.com/jane", website: null },
} as CvExtraction;

describe("updating a candidate from a newer CV", () => {
  it("takes the CV's history and keeps what HR set", () => {
    const f = fieldsFromCv(profile, cv);
    expect(f.headline).toBe("Software Engineering Intern");
    expect(f.experience.map((e) => e.company)).toEqual(["Strategic Information Systems"]);
    expect(f.skills).toEqual([{ name: "Python", level: "Expert" }, { name: "TensorFlow", level: "Intermediate" }]);
    expect(f.linkedin).toBe("https://linkedin.com/in/jane"); // HR's link is kept
    expect(f.github).toBe("https://github.com/jane"); // a missing one is filled in
    expect("notes" in f).toBe(false); // notes are never part of an update
  });

  it("keeps the profile's details where the CV has none", () => {
    const f = fieldsFromCv(profile, { ...cv, experience: [], education: [], certifications: [], skills: [], summary: "", headline: v("") });
    expect(f.experience).toBe(profile.experience);
    expect(f.education).toBe(profile.education);
    expect(f.headline).toBe(profile.headline);
  });

  it("lists the changes in plain words", () => {
    const changes = changesFromCv(profile, cv);
    expect(changes).toContain("Headline: linkedin.com/in/jane · github.com/jane → Software Engineering Intern");
    expect(changes.find((c) => c.startsWith("Jobs:"))).toBe("Jobs: 1 → 1, adds Software Engineering Intern at Strategic Information Systems; removes Intern at Strategic Information System");
    expect(changes).toContain("Certificates: 0 → 1, adds PCAP");
    expect(changes).toContain("GitHub: added");
    expect(changes.some((c) => c.startsWith("Education"))).toBe(false); // unchanged
  });

  it("finds nothing to change when the CV matches the profile", () => {
    const same = fieldsFromCv(profile, cv);
    expect(changesFromCv({ ...profile, ...same }, cv)).toEqual([]);
  });
});
