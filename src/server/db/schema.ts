/**
 * Vettly database schema.
 *
 * Identity and tenancy are relational (organisations, users, memberships, sessions, invitations, tokens).
 * Recruitment records (vacancies, candidates, assessments, interviews, offers and the rest) are stored
 * as typed JSON documents in `records`, one row per record, keyed by organisation. Every query is
 * scoped to an organisation, and each record is written in the request that changed it.
 */
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const organisations = pgTable(
  "organisations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    slug: text("slug").notNull(),
    industry: text("industry").notNull().default(""),
    city: text("city").notNull().default(""),
    country: text("country").notNull().default(""),
    size: text("size").notNull().default(""),
    plan: text("plan").notNull().default("growth"),
    status: text("status").notNull().default("trial"),
    seatsTotal: integer("seats_total").notNull().default(20),
    testCreditsTotal: integer("test_credits_total").notNull().default(500),
    setupComplete: boolean("setup_complete").notNull().default(false),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("organisations_slug_key").on(t.slug)],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    title: text("title").notNull().default(""),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    failedSignIns: integer("failed_sign_ins").notNull().default(0),
    /** After repeated failed sign-ins, sign-in is paused until this time (throttling, not a hard lock). */
    signInPausedUntil: timestamp("sign_in_paused_until", { withTimezone: true }),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email)],
);

export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organisationId: text("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    department: text("department").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.organisationId] }), index("memberships_org_idx").on(t.organisationId)],
);

export const sessions = pgTable("sessions", {
  /** SHA-256 of the cookie token; the token itself is never stored. */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organisationId: text("organisation_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  /** "Remember me": a longer absolute and idle limit. */
  remember: boolean("remember").notNull().default(false),
  /** Last request on this session, for the idle timeout. */
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time codes and links: email verification, password reset, team invitations, candidate test access. */
export const tokens = pgTable(
  "tokens",
  {
    /** SHA-256 of the token or code key. */
    id: text("id").primaryKey(),
    purpose: text("purpose").notNull(),
    email: text("email").notNull().default(""),
    organisationId: text("organisation_id"),
    ref: text("ref"),
    /** For codes: SHA-256 of the code. */
    codeHash: text("code_hash"),
    attempts: integer("attempts").notNull().default(0),
    data: jsonb("data"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tokens_email_purpose_idx").on(t.email, t.purpose)],
);

/** Recruitment records as JSON documents, one row per record. `organisation_id` "platform" holds platform-wide records. */
export const records = pgTable(
  "records",
  {
    organisationId: text("organisation_id").notNull(),
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    data: jsonb("data").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organisationId, t.kind, t.id] })],
);

/** Uploaded files: CVs, documents, letters. Bytes live in S3-compatible storage. */
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  organisationId: text("organisation_id").notNull(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  storageKey: text("storage_key").notNull(),
  pages: integer("pages"),
  text: text("text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
