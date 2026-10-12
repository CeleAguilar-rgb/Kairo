-- El migrator de drizzle-orm corre "CREATE SCHEMA IF NOT EXISTS drizzle" cada vez que se usa,
-- sin importar quién lo ejecute ni si ya existe (y drizzle-kit no muestra el error si falla:
-- bug de su spinner, se traga el motivo). Hace falta este permiso a nivel de base de datos.
GRANT CREATE ON DATABASE "postgres" TO "kairo_api";--> statement-breakpoint
-- La migración 0000 (corrida por postgres) ya disparó esa misma llamada y dejó "drizzle" con
-- postgres como dueño, antes de que kairo_api existiera. Se la traspasamos.
GRANT "kairo_api" TO "postgres";--> statement-breakpoint
ALTER SCHEMA "drizzle" OWNER TO "kairo_api";--> statement-breakpoint
-- OWNER TO en el esquema no toca los objetos que ya había adentro: la tabla y su secuencia
-- siguen siendo de postgres hasta que se las transferimos también.
ALTER TABLE "drizzle"."__drizzle_migrations" OWNER TO "kairo_api";--> statement-breakpoint
ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNER TO "kairo_api";--> statement-breakpoint
REVOKE "kairo_api" FROM "postgres";--> statement-breakpoint
CREATE TYPE "app"."hour_format" AS ENUM('12h', '24h');--> statement-breakpoint
CREATE TYPE "app"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "app"."week_start" AS ENUM('monday', 'sunday');--> statement-breakpoint
CREATE TYPE "app"."connection_provider" AS ENUM('notion', 'canva', 'spotify', 'claude');--> statement-breakpoint
CREATE TYPE "app"."module_id" AS ENUM('home', 'tasks', 'reminders', 'agenda', 'daily', 'finance', 'school', 'projects', 'writings', 'focus');--> statement-breakpoint
CREATE TABLE "app"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"avatar_path" text,
	"timezone" text DEFAULT 'America/Mexico_City' NOT NULL,
	"week_start" "app"."week_start" DEFAULT 'monday' NOT NULL,
	"hour_format" "app"."hour_format" DEFAULT '12h' NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"theme" "app"."theme" DEFAULT 'light' NOT NULL,
	"quiet_from" time,
	"quiet_to" time,
	"decorations_on" boolean DEFAULT true NOT NULL,
	"birthday" date,
	"diary_pin_hash" text,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"provider" "app"."connection_provider" NOT NULL,
	"status" text NOT NULL,
	"token_ref" text,
	"connected_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."home_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"card" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."home_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."login_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"source_type" text NOT NULL,
	"source_id" uuid
);
--> statement-breakpoint
ALTER TABLE "app"."notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."user_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"section" "app"."module_id" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"in_bottom_nav" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."user_sections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."verified_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"session_id" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_hint" text
);
--> statement-breakpoint
ALTER TABLE "app"."verified_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."connections" ADD CONSTRAINT "connections_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."home_cards" ADD CONSTRAINT "home_cards_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."login_codes" ADD CONSTRAINT "login_codes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."user_sections" ADD CONSTRAINT "user_sections_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."verified_sessions" ADD CONSTRAINT "verified_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."profiles"("id") ON DELETE cascade ON UPDATE no action;