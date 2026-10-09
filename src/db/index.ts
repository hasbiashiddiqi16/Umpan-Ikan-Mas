import { getDatabase } from "@netlify/database";
import { drizzle } from "drizzle-orm/netlify-db";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { PgAsyncDatabase } from "drizzle-orm/pg-core/async";
import * as schema from "./schema";

type Database = PgAsyncDatabase<PgQueryResultHKT, typeof schema>;

function createDatabase(): Database {
  return drizzle({ client: getDatabase(), schema });
}

let database: Database | undefined;

export const db = new Proxy({} as Database, {
  get(_target, property) {
    database ??= createDatabase();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
