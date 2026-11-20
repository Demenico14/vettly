"use client";

import * as React from "react";
import { Calendar, Download, Linkedin, MapPin, MoreHorizontal, Plus, Send, Trash2, Upload } from "@/components/icons";
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Tag,
  Tooltip,
  toast,
} from "@/components/ui";
import { StageBadge, VacancyStatusBadge, STAGE_META, VACANCY_META } from "@/components/domain/status-badge";
import { MatchScore, ProvenanceTag, IllustrativeNotice } from "@/components/domain/assessment";
import type { ApplicationStage, VacancyStatus } from "@/types";
import { DSSection, Specimen } from "./specimen";

export function ButtonsSection() {
  const [saving, setSaving] = React.useState(false);
  return (
    <DSSection
      id="buttons"
      title="Buttons"
      description="One primary action per region. Secondary for the alternatives, ghost inside dense toolbars, danger only for destructive actions that also confirm."
    >
      <Specimen label="Variants">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Publish vacancy</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="soft">Shortlist</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="success">Mark as hired</Button>
          <Button variant="warning">Pause vacancy</Button>
          <Button variant="danger">Reject candidate</Button>
          <Button variant="danger-ghost">Remove</Button>
          <Button variant="link">View audit log</Button>
        </div>
      </Specimen>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen label="Sizes and icons">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">
              <Plus />
              Small
            </Button>
            <Button>
              <Upload />
              Upload CVs
            </Button>
            <Button size="lg">
              <Send />
              Send offer
            </Button>
            <Tooltip content="Download report">
              <Button variant="secondary" size="icon" aria-label="Download report">
                <Download />
              </Button>
            </Tooltip>
            <Tooltip content="More actions">
              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </Tooltip>
          </div>
        </Specimen>
        <Specimen label="States" note="Loading disables the button and announces busy state.">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              loading={saving}
              onClick={() => {
                setSaving(true);
                setTimeout(() => {
                  setSaving(false);
                  toast.success("Vacancy saved", "Finance Manager · Bulawayo");
                }, 1400);
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>
              Disabled
            </Button>
          </div>
        </Specimen>
      </div>
    </DSSection>
  );
}

export function BadgesSection() {
  const [skills, setSkills] = React.useState(["IFRS", "Budgeting", "Sage Evolution", "Treasury", "Team leadership"]);
  return (
    <DSSection
      id="badges"
      title="Badges, tags & assessment"
      description="Tinted pills with a dot and a word carry status; square tags carry content such as skills. Assessments always state who produced them: AI output is dashed, copper and labelled illustrative until a person confirms it, then it turns green."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen label="Application stage">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STAGE_META) as ApplicationStage[]).map((s) => (
              <StageBadge key={s} stage={s} />
            ))}
          </div>
        </Specimen>
        <Specimen label="Vacancy status">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(VACANCY_META) as VacancyStatus[]).map((s) => (
              <VacancyStatusBadge key={s} status={s} />
            ))}
            <Badge tone="secondary">Remote</Badge>
            <Badge tone="primary">Full-time</Badge>
            <Badge tone="solid" size="sm">
              New
            </Badge>
          </div>
        </Specimen>
        <Specimen label="Skill tags" note="Removable in edit contexts.">
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Tag key={s} onRemove={() => setSkills((p) => p.filter((x) => x !== s))}>
                {s}
              </Tag>
            ))}
            {skills.length === 0 && (
              <Button variant="link" size="sm" onClick={() => setSkills(["IFRS", "Budgeting", "Sage Evolution"])}>
                Restore skills
              </Button>
            )}
          </div>
        </Specimen>
        <Specimen label="Assessment provenance" note="Hover or focus a tag for its meaning.">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <ProvenanceTag provenance="ai_illustrative" />
              <ProvenanceTag provenance="hr_confirmed" />
              <ProvenanceTag provenance="hr_overridden" />
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <MatchScore score={88} provenance="hr_confirmed" showTag />
              <MatchScore score={74} provenance="ai_illustrative" showTag />
              <MatchScore score={41} provenance="hr_overridden" showTag />
            </div>
            <IllustrativeNotice>Sample tests · scores are not validated</IllustrativeNotice>
          </div>
        </Specimen>
      </div>
    </DSSection>
  );
}

export function AvatarsCardsSection() {
  const [saved, setSaved] = React.useState(false);
  return (
    <DSSection
      id="cards"
      title="Avatars & panels"
      description="Initial avatars are tinted deterministically from the name, so a person keeps the same colour everywhere. Panels group related content; they are not the default wrapper for every element."
    >
      <Specimen label="Avatars">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name="Rutendo Chikwanha" size="lg" status="online" />
          <Avatar name="Tafadzwa Ncube" size="md" status="away" />
          <Avatar name="Nyasha Dube" size="sm" />
          <Avatar name="Farai Mutasa" size="xs" />
          <AvatarStack names={["Tendai Moyo", "Kudzai Chirwa", "Grace Nyathi", "Simba Chari", "Ruvimbo Gumbo", "Chipo Makoni"]} />
        </div>
      </Specimen>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start gap-4 p-5">
            <Avatar name="Rutendo Chikwanha" size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold">Rutendo Chikwanha</h3>
                <StageBadge stage="interview" size="sm" />
              </div>
              <p className="text-sm text-fg-muted">Full-stack developer · 6 yrs · BSc Computer Science, UZ</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  Harare
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" aria-hidden />
                  Panel interview Thu 20 Nov, 10:00
                </span>
                <a href="#cards" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline">
                  <Linkedin className="size-3.5" aria-hidden />
                  LinkedIn
                </a>
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Tag>TypeScript</Tag>
                <Tag>React</Tag>
                <Tag>PostgreSQL</Tag>
                <Tag>AWS</Tag>
              </div>
            </div>
            <MatchScore score={88} provenance="hr_confirmed" size="sm" />
          </div>
          <CardFooter>
            <Button variant="ghost" size="sm" onClick={() => toast.info("Profiles arrive in Module 5")}>
              View profile
            </Button>
            <Button
              variant={saved ? "soft" : "secondary"}
              size="sm"
              onClick={() => {
                setSaved((s) => !s);
                toast.success(saved ? "Removed from talent pool" : "Saved to talent pool", "Rutendo Chikwanha");
              }}
            >
              {saved ? "Saved" : "Save to talent pool"}
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader
            title="Screening weights"
            description="Software Developer · Harare"
            actions={<Badge tone="outline">Draft</Badge>}
          />
          <CardBody>
            <ul className="flex flex-col gap-3 text-sm">
              {[
                ["Technical skills", 40],
                ["Relevant experience", 30],
                ["Education", 15],
                ["Certifications", 15],
              ].map(([k, v]) => (
                <li key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
                  <span className="font-medium">{k}</span>
                  <span className="text-xs font-bold tabular">{v}%</span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <span className="block h-full rounded-full bg-primary-500" style={{ width: `${v}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
          <CardFooter>
            <Button variant="danger-ghost" size="sm" onClick={() => toast.warning("Weights reset", "Using organisation defaults.")}>
              <Trash2 />
              Reset
            </Button>
            <Button size="sm" onClick={() => toast.success("Weights saved")}>
              Save weights
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DSSection>
  );
}
