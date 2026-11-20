"use client";

import * as React from "react";
import { Lock, MoreHorizontal, Plus, Search, ShieldCheck, Trash2, UserPlus } from "@/components/icons";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmModal,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  Input,
  Modal,
  ModalClose,
  Pagination,
  usePagination,
  ModalContent,
  Progress,
  Select,
  Table, TableScroll,
  TBody,
  TD,
  TH,
  THead,
  TR,
  toast,
} from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { services } from "@/services";
import { PERMISSIONS, ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/settings-defaults";
import type { Member, OrgRole, RolePermissions } from "@/types/settings";
import { timeAgo } from "@/lib/utils";
import { MOCK_NOW } from "@/services";

const MOCK_DATE = new Date(MOCK_NOW);
import { Group, SectionSkeleton } from "./settings-shell";

const ROLES: OrgRole[] = ["org_admin", "hr_manager", "recruiter", "hiring_manager"];
const DEPARTMENTS = ["Human Resources", "Finance", "Information Technology", "Marketing", "Operations", "Executive"];

export function UsersSection() {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof services.settings.members>> | null>(null);
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string[]>([]);
  const [inviting, setInviting] = React.useState(false);
  const [confirm, setConfirm] = React.useState<{ kind: "deactivate" | "cancel"; m: Member } | null>(null);
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    services.settings.members().then(setData);
  }, [reload]);

  const refresh = () => setReload((r) => r + 1);
  const order = { active: 0, invited: 1, deactivated: 2 };
  const shown = (data?.members ?? [])
    .filter((m) => (!query || `${m.name} ${m.email} ${m.title} ${m.department}`.toLowerCase().includes(query.toLowerCase())) && (!roleFilter.length || roleFilter.includes(m.role)))
    .sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
  const pager = usePagination(shown, { resetKey: JSON.stringify([query, roleFilter]) });
  if (!data) return <SectionSkeleton />;
  const free = data.seatsTotal - data.seatsUsed;

  async function act(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-fg-muted">
            <span className="text-lg font-bold text-fg tabular">{data.seatsUsed}</span> of {data.seatsTotal} seats used, including pending invitations
          </p>
          <Progress value={(100 * data.seatsUsed) / data.seatsTotal} label="Seats used" className="mt-2 max-w-md" />
          <p className="mt-1.5 text-xs text-fg-subtle">Deactivated people don&rsquo;t use a seat. Their history stays.</p>
        </div>
        <Button onClick={() => setInviting(true)} disabled={free <= 0}>
          <UserPlus />
          Invite people
        </Button>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" aria-label="Search people" />
        </div>
        <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r], count: data.members.filter((m) => m.role === r && m.status !== "deactivated").length }))} />
      </div>

      <Card className="overflow-hidden">
        <TableScroll>
          <Table>
            <THead sticky>
              <TR>
                <TH>Person</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Last active</TH>
                <TH className="w-12">
                  <span className="sr-only">Actions</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {pager.items.map((m) => {
                const isMe = m.id === data.me;
                return (
                  <TR key={m.id} className={m.status === "deactivated" ? "bg-surface-muted" : undefined}>
                    <TD className="min-w-56">
                      <span className="flex items-center gap-3">
                        <Avatar name={m.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-fg">
                            {m.name}
                            {isMe && <span className="ml-1.5 text-xs font-normal text-fg-subtle">(you)</span>}
                          </span>
                          <span className="block truncate text-xs text-fg-subtle">{m.title ? `${m.title} · ${m.department}` : m.email}</span>
                        </span>
                      </span>
                    </TD>
                    <TD className="min-w-44">
                      {isMe || m.status === "deactivated" ? (
                        <span className="text-sm text-fg">{ROLE_LABEL[m.role]}</span>
                      ) : (
                        <Select
                          size="sm"
                          value={m.role}
                          onValueChange={(v) => act(() => services.settings.setRole(m.id, v as OrgRole), `${m.name} is now ${ROLE_LABEL[v as OrgRole].toLowerCase()}`)}
                          options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                        />
                      )}
                    </TD>
                    <TD>
                      {m.status === "active" ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="status" size="sm" dot dotClassName="bg-success-500">
                            Active
                          </Badge>
                          {m.twoFactor && <ShieldCheck className="size-4 text-success-600" aria-label="Two-step verification on" />}
                        </span>
                      ) : m.status === "invited" ? (
                        <Badge tone="status" size="sm" dot dotClassName="bg-warning-500">
                          Invited {timeAgo(m.invitedAt!, MOCK_DATE)}
                        </Badge>
                      ) : (
                        <Badge tone="status" size="sm" dot dotClassName="bg-ink-400">
                          Deactivated
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-sm whitespace-nowrap text-fg-muted">{m.lastActiveAt ? timeAgo(m.lastActiveAt, MOCK_DATE) : "Never"}</TD>
                    <TD>
                      {!isMe && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${m.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{m.email}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {m.status === "invited" && (
                              <>
                                <DropdownMenuItem onSelect={() => act(() => services.settings.resendInvite(m.id), `Invitation sent again to ${m.email}`)}>Resend invitation</DropdownMenuItem>
                                <DropdownMenuItem tone="danger" onSelect={() => setConfirm({ kind: "cancel", m })}>
                                  <Trash2 />
                                  Cancel invitation
                                </DropdownMenuItem>
                              </>
                            )}
                            {m.status === "active" && (
                              <DropdownMenuItem tone="danger" onSelect={() => setConfirm({ kind: "deactivate", m })}>
                                <Lock />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                            {m.status === "deactivated" && <DropdownMenuItem onSelect={() => act(() => services.settings.reactivate(m.id), `${m.name} reactivated`)}>Reactivate</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableScroll>
        <div className="border-t border-line px-4 py-2.5">
          <Pagination p={pager} noun={["person", "people"]} />
        </div>
      </Card>

      <InviteDialog open={inviting} onOpenChange={setInviting} free={free} onInvited={refresh} />
      <ConfirmModal
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "cancel" ? `Cancel ${confirm.m.name}'s invitation?` : `Deactivate ${confirm?.m.name}?`}
        description={
          confirm?.kind === "cancel"
            ? "The link in their email stops working and the seat is freed."
            : "They're signed out and can't sign in again. Their notes, scorecards and approvals stay in the record, and the seat is freed. You can reactivate them later."
        }
        confirmLabel={confirm?.kind === "cancel" ? "Cancel invitation" : "Deactivate"}
        tone="danger"
        onConfirm={() => {
          const c = confirm!;
          return act(() => (c.kind === "cancel" ? services.settings.cancelInvite(c.m.id) : services.settings.deactivate(c.m.id)), c.kind === "cancel" ? "Invitation cancelled" : `${c.m.name} deactivated`);
        }}
      />
    </div>
  );
}

function InviteDialog({ open, onOpenChange, free, onInvited }: { open: boolean; onOpenChange: (o: boolean) => void; free: number; onInvited: () => void }) {
  const blank = { name: "", email: "", role: "hiring_manager" as OrgRole, department: "Finance" };
  const [rows, setRows] = React.useState([blank]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const filled = rows.filter((r) => r.email.trim());
  const set = (i: number, patch: Partial<typeof blank>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Modal open={open} onOpenChange={(o) => (onOpenChange(o), !o && (setRows([blank]), setError(null)))}>
      <ModalContent
        size="lg"
        title="Invite people"
        description={`They get an email with a link to set a password. ${free} ${free === 1 ? "seat" : "seats"} free.`}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              loading={busy}
              disabled={!filled.length}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const out = await services.settings.invite(filled);
                  toast.success(out.length === 1 ? `Invitation sent to ${out[0]!.email}` : `${out.length} invitations sent`);
                  onOpenChange(false);
                  setRows([blank]);
                  onInvited();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Send {filled.length > 1 ? `${filled.length} invitations` : "invitation"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-md border border-line p-3 sm:grid-cols-2">
              <Field label="Email">
                <Input value={r.email} onChange={(e) => set(i, { email: e.target.value })} placeholder="name@msasafinancial.example" autoFocus={i === rows.length - 1} />
              </Field>
              <Field label="Name" optional>
                <Input value={r.name} onChange={(e) => set(i, { name: e.target.value })} />
              </Field>
              <Field label="Role">
                <Select value={r.role} onValueChange={(v) => set(i, { role: v as OrgRole })} options={ROLES.map((x) => ({ value: x, label: ROLE_LABEL[x], description: ROLE_DESCRIPTION[x] }))} />
              </Field>
              <Field label="Department">
                <Select value={r.department} onValueChange={(v) => set(i, { department: v })} options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} />
              </Field>
            </div>
          ))}
          {rows.length < free && (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setRows((rs) => [...rs, blank])}>
              <Plus />
              Add another
            </Button>
          )}
          {error && <p className="text-sm text-danger-700" role="alert">{error}</p>}
        </div>
      </ModalContent>
    </Modal>
  );
}

export function RolesSection() {
  const [roles, setRoles] = React.useState<RolePermissions | null>(null);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    services.settings.roles().then(setRoles);
    services.settings.members().then((d) => setCounts(Object.fromEntries(ROLES.map((r) => [r, d.members.filter((m) => m.role === r && m.status !== "deactivated").length]))));
  }, []);
  if (!roles) return <SectionSkeleton />;
  const groups = [...new Set(PERMISSIONS.map((p) => p.group))];
  return (
    <div className="flex flex-col gap-5">
      <Group title="What each role can do" description="Changes apply straight away and are recorded in the audit log. Organisation admins always have every permission, and only they can manage billing.">
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="min-w-60">Permission</TH>
                {ROLES.map((r) => (
                  <TH key={r} className="min-w-28 text-center">
                    <span className="block">{ROLE_LABEL[r]}</span>
                    <span className="block text-2xs font-normal text-fg-subtle">
                      {counts[r] ?? "–"} {counts[r] === 1 ? "person" : "people"}
                    </span>
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {groups.map((g) => (
                <React.Fragment key={g}>
                  <TR>
                    <TD colSpan={5} className="bg-surface-muted py-1.5 text-xs font-semibold text-fg-muted">
                      {g}
                    </TD>
                  </TR>
                  {PERMISSIONS.filter((p) => p.group === g).map((p) => (
                    <TR key={p.id}>
                      <TD>
                        <span className="block text-sm font-medium text-fg">{p.label}</span>
                        <span className="block text-xs text-fg-subtle">{p.description}</span>
                      </TD>
                      {ROLES.map((r) => {
                        const locked = r === "org_admin" || p.id === "manage_billing";
                        const on = roles[r].includes(p.id);
                        return (
                          <TD key={r} className="text-center">
                            <Checkbox
                              checked={on}
                              disabled={locked}
                              aria-label={`${ROLE_LABEL[r]}: ${p.label}`}
                              onCheckedChange={async (c) => {
                                try {
                                  setRoles(await services.settings.setPermission(r, p.id, c === true));
                                  toast.success(`${ROLE_LABEL[r]}s ${c === true ? "can now" : "can no longer"} ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}`);
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              }}
                            />
                          </TD>
                        );
                      })}
                    </TR>
                  ))}
                </React.Fragment>
              ))}
            </TBody>
          </Table>
        </div>
      </Group>
      <p className="text-xs text-fg-subtle">Hiring managers only ever see candidates for vacancies they manage or interview for, whatever is ticked here.</p>
    </div>
  );
}

