ALTER TABLE "cms_reviews" ADD COLUMN "seed_key" varchar(220);--> statement-breakpoint
CREATE UNIQUE INDEX "cms_reviews_seed_key_unique" ON "cms_reviews" ("seed_key");