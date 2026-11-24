/**
 * Web links on CVs and candidate profiles. CVs usually write them without "https://" ("linkedin.com/in/…"),
 * which a browser would treat as a page inside Vettly, so every link shown is made absolute first.
 */

/** An absolute http(s) address for a link as written, or null when it isn't a usable web address. */
export function externalUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().replace(/[).,;]+$/, "");
  if (!s || /\s/.test(s)) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : /^[a-z][a-z0-9+.-]*:/i.test(s) ? null : `https://${s.replace(/^\/+/, "")}`;
  if (!withScheme) return null; // mailto:, javascript: and other schemes are never links here
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** A short form for showing a link: no scheme, no "www.", no trailing slash. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

export interface CvLinks {
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

// Addresses as CVs write them: with or without a scheme or "www.", not part of an email address.
const URL_LIKE = /(?<![@\w.-])(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s·|,;()<>]*)?/gi;
const NOT_WEBSITES = /(^|\.)(gmail|yahoo|outlook|hotmail|icloud|live)\.|linkedin\.com|github\.com/i;

/** The LinkedIn, GitHub and personal website addresses a CV lists, as absolute links. */
export function linksIn(text: string): CvLinks {
  const found = [...text.matchAll(URL_LIKE)].map((m) => m[0]).filter((s) => /[a-z]\.[a-z]{2,}/i.test(s) && !/^\d+(\.\d+)+$/.test(s));
  const pick = (test: (s: string) => boolean) => {
    const raw = found.find(test);
    return raw ? externalUrl(raw) : null;
  };
  return {
    linkedin: pick((s) => /linkedin\.com\/(in|pub)\//i.test(s)),
    github: pick((s) => /github\.com\/[a-z0-9-]+/i.test(s)),
    // A site of its own: a domain with a real top-level part, not a mail provider, LinkedIn or GitHub, and
    // not a file name or version number that happens to contain dots.
    website: pick((s) => !NOT_WEBSITES.test(s) && /\.(com|net|org|io|dev|ai|app|co|me|info|biz|tech|xyz|[a-z]{2})(\/|$|\.[a-z]{2}(\/|$))/i.test(s) && !/\.(pdf|docx?|png|jpe?g|js|ts|py)$/i.test(s)),
  };
}

/** True when a line is only links (the "linkedin · github · site" line under a name): never a headline. */
export const onlyLinks = (line: string) => {
  const rest = line.replace(URL_LIKE, "").replace(/[\s·|,;•/-]+/g, "");
  return rest.length === 0 && URL_LIKE.test(line) && ((URL_LIKE.lastIndex = 0), true);
};
