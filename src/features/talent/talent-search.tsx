"use client";

import * as React from "react";
import { Bell, Bookmark, Filter, Folder, MapPin, Plus, Search, SearchX, Sparkles, X } from "@/components/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  CheckboxField,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalClose,
  Pagination,
  usePagination,
  ModalContent,
  Select,
  Skeleton,
  SwitchField,
  Tag,
  toast,
} from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { Slider } from "@/components/ui/slider";
import { services, EMPTY_FILTERS, talentSkillVocabulary, type TalentSearchResult } from "@/services";
import type { SkillLevel, Vacancy } from "@/types";
import type { CountryCode } from "@/types/psychometrics";
import type { SavedSearch, TalentFilters, TalentHit, TestFilterFamily } from "@/types/talent";
import { cn } from "@/lib/utils";
import { AVAILABILITY, AddToCollectionDialog, COUNTRY, ConsentBadge, SOURCES, TEST_FAMILY, TestChips, activeCount, describe } from "./meta";
import { TalentDrawer } from "./talent-drawer";

const LEVELS: SkillLevel[] = ["Basic", "Intermediate", "Advanced", "Expert"];

export function TalentSearch({ initial, vacancyId, onSaved }: { initial: TalentFilters | null; vacancyId: string | null; onSaved: () => void }) {
  const [f, setF] = React.useState<TalentFilters>(initial ?? EMPTY_FILTERS);
  const [result, setResult] = React.useState<TalentSearchResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Map<string, TalentHit>>(new Map());
  const [open, setOpen] = React.useState<TalentHit | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [collecting, setCollecting] = React.useState<TalentHit[] | null>(null);
  const [vacancies, setVacancies] = React.useState<Vacancy[]>([]);
  const [forVacancy, setForVacancy] = React.useState<string>(vacancyId ?? "");
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    services.vacancies.list().then((v) => setVacancies(v.filter((x) => x.status === "open")));
  }, []);

  // Filters for a vacancy come from its essential skills and experience.
  React.useEffect(() => {
    if (!vacancyId) return;
    services.talent.forVacancy(vacancyId).then(setF);
  }, [vacancyId]);

  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      services.talent
        .search(f)
        .then((r) => alive && (setResult(r), setError(null)))
        .catch((e: Error) => alive && setError(e.message));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [f, reload]);

  const set = (patch: Partial<TalentFilters>) => setF((x) => ({ ...x, ...patch }));
  const vacancy = vacancies.find((v) => v.id === forVacancy);
  const hits = result?.hits ?? [];
  const n = activeCount(f);
  const pager = usePagination(hits, { pageSize: 10, resetKey: JSON.stringify(f) });
  const top = React.useRef<HTMLUListElement>(null);

  function toggle(h: TalentHit) {
    setSelected((s) => {
      const next = new Map(s);
      if (next.has(h.id)) next.delete(h.id);
      else next.set(h.id, h);
      return next;
    });
  }

  const filterPanel = <FilterPanel f={f} set={set} facets={result?.facets} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="w-full lg:max-w-md">
          <Input leading={<Search />} value={f.query} onChange={(e) => set({ query: e.target.value })} placeholder="Name, title, employer or keyword" aria-label="Search the talent pool" />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <div className="w-full sm:w-64">
            <Select
              value={forVacancy}
              onValueChange={async (id) => {
                setForVacancy(id);
                setF(await services.talent.forVacancy(id));
              }}
              placeholder="Find people for a vacancy"
              options={vacancies.map((v) => ({ value: v.id, label: v.title, description: v.location }))}
            />
          </div>
          <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
            <Filter />
            Filters{n > 0 && <span className="tabular"> ({n})</span>}
          </Button>
          <Button variant="secondary" onClick={() => setSaving(true)}>
            <Bell />
            Save search
          </Button>
        </div>
      </div>

      {vacancy && (
        <Alert
          tone="info"
          title={`People who could fit ${vacancy.title}`}
          action={
            <Button size="sm" variant="ghost" onClick={() => (setForVacancy(""), setF(EMPTY_FILTERS))}>
              Clear
            </Button>
          }
        >
          Filters are set from its essential skills{f.minYears ? ` and ${f.minYears}+ years' experience` : ""}. Adjust them to widen or narrow the list.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4">{filterPanel}</div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-sm text-fg-muted" aria-live="polite">
              {result ? (
                <>
                  <span className="font-semibold text-fg tabular">{hits.length}</span> {hits.length === 1 ? "person" : "people"} · {describe(f)}
                </>
              ) : (
                "Searching…"
              )}
            </p>
            {n > 0 && (
              <button type="button" onClick={() => setF({ ...EMPTY_FILTERS, query: f.query })} className="text-sm font-medium text-primary-700 hover:underline">
                Clear filters
              </button>
            )}
          </div>

          {result && result.related.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-subtle">
                <Sparkles className="size-3.5" />
                Also try
              </span>
              {result.related.map((s) => (
                <button key={s} type="button" onClick={() => set({ skills: [...f.skills, s] })} className="pressable inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-xs font-medium text-fg-muted hover:border-line-strong hover:text-fg">
                  <Plus className="size-3" />
                  {s}
                </button>
              ))}
            </div>
          )}

          {result && result.facets.lapsedHidden > 0 && (
            <p className="text-xs text-fg-subtle">
              {result.facets.lapsedHidden} more {result.facets.lapsedHidden === 1 ? "person matches" : "people match"} but their consent to keep their details has lapsed.{" "}
              <button type="button" className="font-medium text-primary-700 hover:underline" onClick={() => set({ consentValidOnly: false })}>
                Show them
              </button>
            </p>
          )}

          {selected.size > 0 && (
            <div className="material-bar sticky top-2 z-10 flex items-center gap-3 rounded-lg px-4 py-2.5 shadow-md">
              <span className="text-sm font-semibold text-fg tabular">{selected.size} selected</span>
              <Button size="sm" onClick={() => setCollecting([...selected.values()])}>
                <Folder />
                Add to collection
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Map())}>
                <X />
                Clear
              </Button>
            </div>
          )}

          {error ? (
            <Alert tone="danger" title="Search didn't run">
              {error}
            </Alert>
          ) : !result ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : hits.length === 0 ? (
            <Card>
              <EmptyState
                icon={<SearchX />}
                title="Nobody matches all of that"
                description={f.skills.length > 1 ? "Try fewer skills, or one of the related skills above." : f.test ? "Lower the test threshold, or include anyone who hasn't taken that test yet by removing it." : "Loosen a filter to see more people."}
                action={
                  <Button size="sm" variant="secondary" onClick={() => setF(EMPTY_FILTERS)}>
                    Clear filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
            <ul className="flex scroll-mt-16 flex-col gap-3" ref={top}>
              {pager.items.map((h) => (
                <ResultCard key={h.id} h={h} f={f} selected={selected.has(h.id)} onSelect={() => toggle(h)} onOpen={() => setOpen(h)} onCollect={() => setCollecting([h])} />
              ))}
            </ul>
            <Pagination p={pager} noun={["person", "people"]} sizes={[10, 25, 50]} anchor={top} className="px-1" />
            </>
          )}
        </div>
      </div>

      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters" className="w-[min(24rem,92vw)]">
        <div className="flex-1 overflow-y-auto px-5 py-4">{filterPanel}</div>
        <div className="border-t border-line px-5 py-3">
          <Button className="w-full" onClick={() => setFiltersOpen(false)}>
            Show {hits.length} {hits.length === 1 ? "person" : "people"}
          </Button>
        </div>
      </Drawer>

      <TalentDrawer hit={open} onOpenChange={(o) => !o && setOpen(null)} vacancyId={forVacancy || undefined} onChanged={() => setReload((r) => r + 1)} onCollect={(h) => setCollecting([h])} />
      <AddToCollectionDialog
        open={!!collecting}
        onOpenChange={(o) => !o && setCollecting(null)}
        people={(collecting ?? []).map((h) => ({ id: h.id, kind: h.kind, name: h.name }))}
        onAdded={() => (setSelected(new Map()), setReload((r) => r + 1))}
      />
      {saving && <SaveSearchDialog open={saving} onOpenChange={setSaving} filters={f} count={hits.length} suggested={vacancy ? `People for ${vacancy.title}` : ""} onSaved={onSaved} />}
    </div>
  );
}

function ResultCard({ h, f, selected, onSelect, onOpen, onCollect }: { h: TalentHit; f: TalentFilters; selected: boolean; onSelect: () => void; onOpen: () => void; onCollect: () => void }) {
  const searched = (name: string) => f.skills.some((s) => name.toLowerCase().includes(s.toLowerCase()));
  const skills = [...h.skills].sort((a, b) => Number(searched(b.name)) - Number(searched(a.name)));
  return (
    <li>
      <Card className={cn("relative flex gap-3 p-4 transition-shadow hover:shadow-md sm:gap-4 sm:p-5", selected && "ring-2 ring-primary-500")}>
        <Checkbox checked={selected} onCheckedChange={onSelect} aria-label={`Select ${h.name}`} className="mt-3 shrink-0" />
        <Avatar name={h.name} className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={onOpen} className="text-left text-[0.9375rem] font-semibold text-fg after:absolute after:inset-0 after:content-[''] hover:underline">
                {h.name}
              </button>
              <p className="truncate text-sm text-fg-muted">{h.headline}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {h.location}, {COUNTRY[h.country]}
                </span>
                <span>· {h.availability}</span>
                {h.openToRelocation && <span>· Open to relocating</span>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-xl leading-none font-bold text-fg tabular">{h.relevance}</span>
              <span className="text-2xs text-fg-subtle">fit</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 6).map((s) => (
              <Tag key={s.name} className={cn(searched(s.name) && "bg-primary-50 text-primary-800")}>
                {s.name}
                <span className="text-2xs opacity-70">{s.level}</span>
              </Tag>
            ))}
            {skills.length > 6 && <span className="self-center text-xs text-fg-subtle">+{skills.length - 6}</span>}
          </div>

          {h.tests.length > 0 && (
            <div className="mt-2">
              <TestChips hit={h} highlight={f.test} />
            </div>
          )}

          <div className="relative z-[1] mt-3 flex flex-wrap items-center gap-2">
            {h.kind === "candidate" ? (
              <Badge tone="primary" size="sm">
                Applied: {h.application?.vacancyTitle}
              </Badge>
            ) : (
              <Badge tone="outline" size="sm">
                {h.source}
              </Badge>
            )}
            <ConsentBadge until={h.consentUntil} />
            {h.collections.map((c) => (
              <Badge key={c} tone="secondary" size="sm">
                <Folder />
                {c}
              </Badge>
            ))}
            {h.history && <span className="line-clamp-1 min-w-0 flex-1 text-xs text-fg-subtle">{h.history}</span>}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={onCollect}>
              <Bookmark />
              <span className="sr-only sm:not-sr-only">Collect</span>
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}

function FilterPanel({ f, set, facets }: { f: TalentFilters; set: (p: Partial<TalentFilters>) => void; facets?: TalentSearchResult["facets"] }) {
  const vocab = React.useMemo(() => talentSkillVocabulary(), []);
  const [skill, setSkill] = React.useState("");
  const suggestions = skill.trim() ? vocab.filter((s) => s.toLowerCase().includes(skill.trim().toLowerCase()) && !f.skills.includes(s)).slice(0, 6) : [];
  const add = (s: string) => {
    if (!s.trim() || f.skills.some((x) => x.toLowerCase() === s.trim().toLowerCase())) return;
    set({ skills: [...f.skills, s.trim()] });
    setSkill("");
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold text-fg-muted">Skills (all of them)</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add(suggestions[0] ?? skill);
          }}
          className="relative"
        >
          <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Add a skill, e.g. IFRS" aria-label="Add a skill" />
          {suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-lg" role="listbox" aria-label="Matching skills">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => add(s)} className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-100">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        {f.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {f.skills.map((s) => (
              <Tag key={s} className="bg-primary-50 text-primary-800" onRemove={() => set({ skills: f.skills.filter((x) => x !== s) })}>
                {s}
              </Tag>
            ))}
          </div>
        )}
        {f.skills.length === 0 && facets && facets.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {facets.skills.slice(0, 8).map((s) => (
              <button key={s.name} type="button" onClick={() => add(s.name)} className="inline-flex h-6 items-center gap-1 rounded-sm border border-line px-2 text-xs text-fg-muted hover:border-line-strong hover:text-fg">
                {s.name}
                <span className="text-fg-subtle tabular">{s.count}</span>
              </button>
            ))}
          </div>
        )}
        <Field label="Level in those skills">
          <Select value={f.minLevel ?? "any"} onValueChange={(v) => set({ minLevel: v === "any" ? null : (v as SkillLevel) })} options={[{ value: "any", label: "Any level" }, ...LEVELS.slice(1).map((l) => ({ value: l, label: `${l} or above` }))]} />
        </Field>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold text-fg-muted">Experience</h2>
          <span className="text-xs font-semibold text-fg tabular">{f.minYears ? `${f.minYears}+ years` : "Any"}</span>
        </div>
        <Slider label="Minimum years of experience" min={0} max={15} step={1} value={[f.minYears]} onValueChange={([v]) => set({ minYears: v ?? 0 })} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold text-fg-muted">Test results</h2>
        <Select
          value={f.test?.family ?? "none"}
          onValueChange={(v) => set({ test: v === "none" ? null : { family: v as TestFilterFamily, min: f.test?.min ?? 70 } })}
          options={[{ value: "none", label: "Any, or none taken" }, ...Object.entries(TEST_FAMILY).map(([value, label]) => ({ value, label }))]}
        />
        {f.test && (
          <>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs text-fg-subtle">At or above</span>
              <span className="text-xs font-semibold text-fg tabular">{f.test.min}th percentile</span>
            </div>
            <Slider label="Minimum percentile" min={30} max={95} step={5} value={[f.test.min]} onValueChange={([v]) => set({ test: { ...f.test!, min: v ?? 70 } })} />
            <p className="text-2xs text-fg-subtle">Against the norm group each person was compared with. People who haven&rsquo;t taken the test are left out.</p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold text-fg-muted">Where and when</h2>
        <div className="flex flex-wrap gap-2">
          <FilterSelect label="Country" value={f.countries} onChange={(v) => set({ countries: v as CountryCode[] })} options={(Object.keys(COUNTRY) as CountryCode[]).map((c) => ({ value: c, label: COUNTRY[c], count: facets?.countries.find((x) => x.code === c)?.count }))} />
          <FilterSelect label="Availability" value={f.availability} onChange={(v) => set({ availability: v as TalentFilters["availability"] })} options={AVAILABILITY.map((a) => ({ value: a, label: a }))} />
          <FilterSelect label="Source" value={f.sources} onChange={(v) => set({ sources: v })} options={SOURCES.map((s) => ({ value: s, label: s }))} />
        </div>
        <CheckboxField label="Open to relocating" checked={f.relocation} onCheckedChange={(c) => set({ relocation: c === true })} className="mt-1" />
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <SwitchField label="Include active applicants" description="People with an application in progress" checked={f.includeApplicants} onCheckedChange={(c) => set({ includeApplicants: c })} />
        <SwitchField label="Hide lapsed consent" description="People you can't approach until they agree again" checked={f.consentValidOnly} onCheckedChange={(c) => set({ consentValidOnly: c })} />
      </section>
    </div>
  );
}

function SaveSearchDialog({ open, onOpenChange, filters, count, suggested, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; filters: TalentFilters; count: number; suggested: string; onSaved: () => void }) {
  const [name, setName] = React.useState(suggested || filters.skills.join(", "));
  const [alert, setAlert] = React.useState<SavedSearch["alert"]>("weekly");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        title="Save this search"
        description={`${describe(filters)}. ${count} ${count === 1 ? "person matches" : "people match"} now.`}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await services.talent.saveSearch(name, filters, alert);
                  toast.success("Search saved", alert === "off" ? "Run it again from Saved searches." : `You'll get a ${alert} email when someone new matches.`);
                  onOpenChange(false);
                  onSaved();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name" error={error ?? undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treasury accountants, Harare" autoFocus />
          </Field>
          <Field label="Tell me about new matches">
            <Select value={alert} onValueChange={(v) => setAlert(v as SavedSearch["alert"])} options={[{ value: "daily", label: "Daily email" }, { value: "weekly", label: "Weekly email" }, { value: "off", label: "Don't email me" }]} />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}

