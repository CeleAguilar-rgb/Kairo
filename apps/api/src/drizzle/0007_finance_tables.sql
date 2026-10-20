CREATE TYPE "app"."card_color" AS ENUM('ink', 'lavender', 'sand', 'lavender_soft');--> statement-breakpoint
CREATE TYPE "app"."card_kind" AS ENUM('debit', 'credit', 'cash');--> statement-breakpoint
CREATE TYPE "app"."category_color" AS ENUM('lavender', 'lavender_soft', 'sand', 'peach', 'cream');--> statement-breakpoint
CREATE TYPE "app"."category_icon" AS ENUM('cart', 'food', 'car', 'card', 'star', 'heart', 'dots', 'tag', 'income', 'gift');--> statement-breakpoint
CREATE TYPE "app"."category_kind" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TYPE "app"."debt_kind" AS ENUM('person', 'card', 'loan', 'other');--> statement-breakpoint
CREATE TYPE "app"."membership_cadence" AS ENUM('monthly', 'yearly', 'weekly');--> statement-breakpoint
CREATE TYPE "app"."membership_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "app"."transaction_kind" AS ENUM('expense', 'income', 'saving_deposit', 'saving_withdrawal', 'debt_payment');--> statement-breakpoint
CREATE TABLE "app"."cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"kind" "app"."card_kind" NOT NULL,
	"last4" text,
	"color" "app"."card_color" DEFAULT 'lavender' NOT NULL,
	"cut_day" integer,
	"due_day" integer,
	CONSTRAINT "cards_last4_format" CHECK ("app"."cards"."last4" is null or "app"."cards"."last4" ~ '^[0-9]{4}$'),
	CONSTRAINT "cards_cut_day_range" CHECK ("app"."cards"."cut_day" is null or ("app"."cards"."cut_day" between 1 and 31)),
	CONSTRAINT "cards_due_day_range" CHECK ("app"."cards"."due_day" is null or ("app"."cards"."due_day" between 1 and 31))
);
--> statement-breakpoint
ALTER TABLE "app"."cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"key" text,
	"name" text NOT NULL,
	"kind" "app"."category_kind" NOT NULL,
	"color" "app"."category_color" NOT NULL,
	"icon" "app"."category_icon" DEFAULT 'tag' NOT NULL,
	"monthly_limit_cents" bigint,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_limit_positive" CHECK ("app"."categories"."monthly_limit_cents" is null or "app"."categories"."monthly_limit_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"kind" "app"."debt_kind" NOT NULL,
	"total_cents" bigint NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"annual_interest_pct" double precision,
	"monthly_payment_cents" bigint,
	"next_payment_on" date,
	CONSTRAINT "debts_total_positive" CHECK ("app"."debts"."total_cents" > 0),
	CONSTRAINT "debts_monthly_payment_positive" CHECK ("app"."debts"."monthly_payment_cents" is null or "app"."debts"."monthly_payment_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."debts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."finance_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_alert_at_80" boolean DEFAULT true NOT NULL,
	"budget_alert_over" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "app"."finance_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"cadence" "app"."membership_cadence" NOT NULL,
	"charge_day" integer,
	"charge_month" integer,
	"charge_weekday" integer,
	"card_id" uuid,
	"notify" boolean DEFAULT true NOT NULL,
	"status" "app"."membership_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "memberships_amount_positive" CHECK ("app"."memberships"."amount_cents" > 0),
	CONSTRAINT "memberships_charge_day_range" CHECK ("app"."memberships"."charge_day" is null or ("app"."memberships"."charge_day" between 1 and 31)),
	CONSTRAINT "memberships_charge_month_range" CHECK ("app"."memberships"."charge_month" is null or ("app"."memberships"."charge_month" between 1 and 12)),
	CONSTRAINT "memberships_charge_weekday_range" CHECK ("app"."memberships"."charge_weekday" is null or ("app"."memberships"."charge_weekday" between 0 and 6))
);
--> statement-breakpoint
ALTER TABLE "app"."memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"target_cents" bigint NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"due_on" date,
	CONSTRAINT "savings_goals_target_positive" CHECK ("app"."savings_goals"."target_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."savings_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"kind" "app"."transaction_kind" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"concept" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"occurred_on" date NOT NULL,
	"category_id" uuid,
	"card_id" uuid,
	"saving_id" uuid,
	"debt_id" uuid,
	"membership_id" uuid,
	"repeat_monthly" boolean DEFAULT false NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("app"."transactions"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."cards" ADD CONSTRAINT "cards_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."categories" ADD CONSTRAINT "categories_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."debts" ADD CONSTRAINT "debts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."finance_settings" ADD CONSTRAINT "finance_settings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "app"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."savings_goals" ADD CONSTRAINT "savings_goals_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "app"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "app"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_saving_id_savings_goals_id_fk" FOREIGN KEY ("saving_id") REFERENCES "app"."savings_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "app"."debts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "app"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_key_uq" ON "app"."categories" USING btree ("user_id","key") WHERE "app"."categories"."key" is not null;--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "app"."transactions" USING btree ("user_id","occurred_on");