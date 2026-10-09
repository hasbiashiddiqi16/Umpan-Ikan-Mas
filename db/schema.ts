import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export type CmsIngredient = { name: string; brand: string; amount: string };

export const cmsRecipes = pgTable("cms_recipes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary").notNull(),
  category: varchar("category", { length: 40 }).notNull().default("Harian"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  image: text("image").notNull().default("/images/recipe-putih.jpg"),
  price: varchar("price", { length: 80 }).notNull().default("Rp15.000–30.000"),
  priceValue: integer("price_value").notNull().default(20000),
  difficulty: varchar("difficulty", { length: 40 }).notNull().default("Mudah"),
  rating: integer("rating_tenths").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  users: integer("users").notNull().default(0),
  popularity: integer("popularity").notNull().default(0),
  weather: jsonb("weather").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  water: jsonb("water").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  fishingTypes: jsonb("fishing_types").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  provinces: jsonb("provinces").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  seasons: jsonb("seasons").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  ingredients: jsonb("ingredients").$type<CmsIngredient[]>().notNull().default(sql`'[]'::jsonb`),
  steps: jsonb("steps").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  suitable: jsonb("suitable").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  notSuitable: jsonb("not_suitable").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  author: varchar("author", { length: 100 }).notNull().default("Tim UMPAN MAS"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cms_recipes_slug_unique").on(table.slug),
  index("cms_recipes_status_updated_idx").on(table.status, table.updatedAt),
]);

export const cmsReviews = pgTable("cms_reviews", {
  id: serial("id").primaryKey(),
  recipeSlug: varchar("recipe_slug", { length: 180 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  location: varchar("location", { length: 180 }).notNull(),
  rating: integer("rating").notNull(),
  weather: varchar("weather", { length: 30 }).notNull(),
  water: varchar("water", { length: 30 }).notNull(),
  fishingType: varchar("fishing_type", { length: 30 }).notNull(),
  catchCount: integer("catch_count"),
  comment: text("comment").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("cms_reviews_status_created_idx").on(table.status, table.createdAt),
  index("cms_reviews_recipe_idx").on(table.recipeSlug),
]);

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: varchar("event_type", { length: 40 }).notNull().default("page_view"),
  path: varchar("path", { length: 500 }).notNull(),
  entitySlug: varchar("entity_slug", { length: 180 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("analytics_events_created_idx").on(table.createdAt),
  index("analytics_events_path_created_idx").on(table.path, table.createdAt),
]);
