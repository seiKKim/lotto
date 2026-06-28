// data/seed/winning-stores.json → DB(winning_stores). 로컬(file:) 또는 Turso(env).
import { createClient } from "@libsql/client";
import fs from "node:fs";

const JSON_PATH = process.argv[2] ?? "data/seed/winning-stores.json";
const url = process.env.TURSO_DATABASE_URL ?? "file:data/lotto.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!fs.existsSync(JSON_PATH)) {
  console.error(`시드 없음: ${JSON_PATH}`);
  process.exit(1);
}

const db = createClient({ url, authToken });
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS winning_stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, address TEXT NOT NULL,
    lat REAL NOT NULL, lng REAL NOT NULL,
    win_count INTEGER NOT NULL DEFAULT 1, last_round INTEGER,
    UNIQUE(name, address)
  );
`);

const SQL = `INSERT INTO winning_stores (name, address, lat, lng, win_count, last_round)
  VALUES (?,?,?,?,?,?)
  ON CONFLICT(name, address) DO UPDATE SET
    lat=excluded.lat, lng=excluded.lng, win_count=excluded.win_count, last_round=excluded.last_round`;

const stores = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const stmts = stores.map((s) => ({
  sql: SQL,
  args: [s.name, s.address, s.lat, s.lng, s.win_count, s.last_round ?? null],
}));

const CHUNK = 200;
for (let i = 0; i < stmts.length; i += CHUNK) {
  await db.batch(stmts.slice(i, i + CHUNK), "write");
  process.stdout.write(`\r적재 ${Math.min(i + CHUNK, stmts.length)}/${stmts.length}`);
}
const c = await db.execute("SELECT COUNT(*) AS c FROM winning_stores");
console.log(`\nseeded ${stores.length} → ${url} (총 ${c.rows[0].c}곳)`);
