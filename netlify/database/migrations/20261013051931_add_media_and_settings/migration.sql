CREATE TABLE "cms_media" (
	"key" varchar(60) PRIMARY KEY,
	"mime_type" varchar(60) NOT NULL,
	"data" text NOT NULL,
	"byte_size" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_settings" (
	"key" varchar(60) PRIMARY KEY,
	"value" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
