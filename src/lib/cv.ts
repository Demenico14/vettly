/** CV processing vocabulary shared by the browser and the server. */
import type { Availability, CvFailure, CvFormat } from "@/types";

export function formatOf(name: string): CvFormat {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "pdf" ? "PDF" : ext === "doc" || ext === "docx" ? "Word" : "Image";
}

export const FAILURE_COPY: Record<CvFailure, { title: string; help: string }> = {
  password_protected: {
    title: "Password protected",
    help: "The file is locked with a password. Ask the candidate for an unlocked copy, or type the details in yourself.",
  },
  unreadable: {
    title: "File could not be opened",
    help: "Vettly couldn't read text from this file. It may be damaged, a scan or photo, or an old .doc file. Ask for a PDF or .docx, or type the details in yourself.",
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

export const AVAILABILITY_OPTIONS: Availability[] = ["Immediately", "2 weeks' notice", "1 month's notice", "3 months' notice"];
