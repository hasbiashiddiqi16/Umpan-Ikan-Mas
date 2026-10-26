CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY,
	"event_type" varchar(40) DEFAULT 'page_view' NOT NULL,
	"path" varchar(500) NOT NULL,
	"entity_slug" varchar(180),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_recipes" (
	"id" serial PRIMARY KEY,
	"slug" varchar(180) NOT NULL,
	"title" varchar(180) NOT NULL,
	"summary" text NOT NULL,
	"category" varchar(40) DEFAULT 'Harian' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"image" text DEFAULT '/images/recipe-putih.jpg' NOT NULL,
	"price" varchar(80) DEFAULT 'Rp15.000–30.000' NOT NULL,
	"price_value" integer DEFAULT 20000 NOT NULL,
	"difficulty" varchar(40) DEFAULT 'Mudah' NOT NULL,
	"rating_tenths" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"users" integer DEFAULT 0 NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"weather" jsonb DEFAULT '[]' NOT NULL,
	"water" jsonb DEFAULT '[]' NOT NULL,
	"fishing_types" jsonb DEFAULT '[]' NOT NULL,
	"provinces" jsonb DEFAULT '[]' NOT NULL,
	"seasons" jsonb DEFAULT '[]' NOT NULL,
	"ingredients" jsonb DEFAULT '[]' NOT NULL,
	"steps" jsonb DEFAULT '[]' NOT NULL,
	"suitable" jsonb DEFAULT '[]' NOT NULL,
	"not_suitable" jsonb DEFAULT '[]' NOT NULL,
	"author" varchar(100) DEFAULT 'Tim UMPAN MAS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_reviews" (
	"id" serial PRIMARY KEY,
	"recipe_slug" varchar(180) NOT NULL,
	"name" varchar(80) NOT NULL,
	"location" varchar(180) NOT NULL,
	"rating" integer NOT NULL,
	"weather" varchar(30) NOT NULL,
	"water" varchar(30) NOT NULL,
	"fishing_type" varchar(30) NOT NULL,
	"catch_count" integer,
	"comment" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analytics_events_created_idx" ON "analytics_events" ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_path_created_idx" ON "analytics_events" ("path","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_recipes_slug_unique" ON "cms_recipes" ("slug");--> statement-breakpoint
CREATE INDEX "cms_recipes_status_updated_idx" ON "cms_recipes" ("status","updated_at");--> statement-breakpoint
CREATE INDEX "cms_reviews_status_created_idx" ON "cms_reviews" ("status","created_at");--> statement-breakpoint
CREATE INDEX "cms_reviews_recipe_idx" ON "cms_reviews" ("recipe_slug");