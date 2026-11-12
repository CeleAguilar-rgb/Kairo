CREATE TYPE "app"."color_theme" AS ENUM('lavender', 'sage', 'aqua', 'forest', 'sky', 'ocean', 'mustard', 'sand', 'peach', 'coral', 'pink', 'wine');--> statement-breakpoint
CREATE TYPE "app"."theme_intensity" AS ENUM('subtle', 'tinted', 'vivid');--> statement-breakpoint
ALTER TABLE "app"."profiles" ADD COLUMN "color_theme" "app"."color_theme" DEFAULT 'lavender' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."profiles" ADD COLUMN "theme_intensity" "app"."theme_intensity" DEFAULT 'subtle' NOT NULL;