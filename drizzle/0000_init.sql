CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"organisation_id" text NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"pages" integer,
	"text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" text NOT NULL,
	"organisation_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_id_organisation_id_pk" PRIMARY KEY("user_id","organisation_id")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"slug" text NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"plan" text DEFAULT 'growth' NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"seats_total" integer DEFAULT 20 NOT NULL,
	"test_credits_total" integer DEFAULT 500 NOT NULL,
	"setup_complete" boolean DEFAULT false NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"organisation_id" text NOT NULL,
	"kind" text NOT NULL,
	"id" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "records_organisation_id_kind_id_pk" PRIMARY KEY("organisation_id","kind","id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organisation_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"organisation_id" text,
	"ref" text,
	"code_hash" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"data" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"failed_sign_ins" integer DEFAULT 0 NOT NULL,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_org_idx" ON "memberships" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tokens_email_purpose_idx" ON "tokens" USING btree ("email","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");