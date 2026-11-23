/**
 * The organisation's letterhead: what goes at the top and bottom of offer letters (on screen and as PDF) and of
 * candidate emails. Built from Settings → Organisation (name, address, contact details) and Settings → Branding
 * (logo, colour, footer), so it's set once and used everywhere.
 */
import type { OrgSettings } from "@/types/settings";

export interface Letterhead {
  organisationId: string;
  name: string;
  colour: string;
  logoFileId: string | null;
  /** Show the name beside the logo. Always true without a logo. */
  showName: boolean;
  /** Address, phone and website lines under the name, when the organisation shows them. */
  contact: string[];
  footer: string;
}

export function letterheadOf(organisationId: string, s: Pick<OrgSettings, "profile" | "branding">): Letterhead {
  const p = s.profile;
  const b = s.branding;
  const name = p.tradingName || p.legalName;
  const place = [p.address, p.city, p.country].map((x) => x?.trim()).filter(Boolean).join(", ");
  const contact = b.letterContact === false ? [] : [place, [p.phone, p.website?.replace(/^https?:\/\//, "")].filter(Boolean).join(" · ")].filter(Boolean);
  const footer = b.letterFooter?.trim() || [p.legalName, p.registrationNumber && `Registration no. ${p.registrationNumber}`].filter(Boolean).join(" · ");
  const logoFileId = b.logoFileId ?? null;
  return { organisationId, name, colour: /^#[0-9a-f]{6}$/i.test(b.colour) ? b.colour : "#16624F", logoFileId, showName: !logoFileId || b.letterName !== false, contact, footer };
}

/** Initials for organisations without a logo. */
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
