"use client";

import { SettingsShell, type SectionId } from "./settings-shell";
import { BrandingSection, NotificationsSection, OrganisationSection, PrivacySection } from "./sections-general";
import { RolesSection, UsersSection } from "./sections-people";
import { AssessmentsSection, RecruitmentSection } from "./sections-hiring";
import { AuditSection, BillingSection } from "./sections-admin";

const VIEWS: Record<SectionId, () => React.ReactNode> = {
  organisation: OrganisationSection,
  branding: BrandingSection,
  users: UsersSection,
  roles: RolesSection,
  recruitment: RecruitmentSection,
  assessments: AssessmentsSection,
  notifications: NotificationsSection,
  privacy: PrivacySection,
  audit: AuditSection,
  billing: BillingSection,
};

export function SettingsPage({ section }: { section: SectionId }) {
  const View = VIEWS[section];
  return (
    <SettingsShell section={section}>
      <View />
    </SettingsShell>
  );
}
