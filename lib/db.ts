import { createClient, type Client } from "@libsql/client";

// 로컬 개발: file: URL (data/lotto.db). 프로덕션(Vercel): Turso libsql:// URL.
// 둘 다 동일한 libSQL 클라이언트로 접근한다.
const url = process.env.TURSO_DATABASE_URL ?? "file:data/lotto.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS stores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    address     TEXT,
    lat         REAL,
    lng         REAL,
    first_round INTEGER,
    memo        TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(name, address)
  );

  CREATE TABLE IF NOT EXISTS draws (
    round         INTEGER PRIMARY KEY,
    draw_date     TEXT    NOT NULL,
    n1 INTEGER NOT NULL, n2 INTEGER NOT NULL, n3 INTEGER NOT NULL,
    n4 INTEGER NOT NULL, n5 INTEGER NOT NULL, n6 INTEGER NOT NULL,
    bonus         INTEGER NOT NULL,
    first_winners INTEGER,
    first_prize   INTEGER,
    total_sales   INTEGER,
    fetched_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    round         INTEGER NOT NULL,
    store_id      INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    purchase_date TEXT,
    amount        INTEGER NOT NULL DEFAULT 5000,
    memo          TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS games (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    slot        TEXT,
    mode        TEXT NOT NULL DEFAULT 'auto',
    n1 INTEGER NOT NULL, n2 INTEGER NOT NULL, n3 INTEGER NOT NULL,
    n4 INTEGER NOT NULL, n5 INTEGER NOT NULL, n6 INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS results (
    game_id     INTEGER PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
    round       INTEGER NOT NULL,
    match_count INTEGER NOT NULL,
    bonus_match INTEGER NOT NULL DEFAULT 0,
    rank        INTEGER,
    prize       INTEGER NOT NULL DEFAULT 0,
    scored_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- 1등 배출 판매점 (smok95 winning-stores 집계). 좌표 포함 → "내 주변" 검색용.
  CREATE TABLE IF NOT EXISTS winning_stores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    address    TEXT NOT NULL,
    lat        REAL NOT NULL,
    lng        REAL NOT NULL,
    win_count  INTEGER NOT NULL DEFAULT 1,  -- 1등 배출 횟수
    last_round INTEGER,                      -- 최근 배출 회차
    UNIQUE(name, address)
  );

  CREATE INDEX IF NOT EXISTS idx_purchases_round ON purchases(round);
  CREATE INDEX IF NOT EXISTS idx_games_purchase  ON games(purchase_id);
  CREATE INDEX IF NOT EXISTS idx_results_round    ON results(round);
`;

let _dbPromise: Promise<Client> | null = null;

/** 싱글턴 libSQL 클라이언트. 최초 호출 시 스키마를 보장한다. */
export function getDb(): Promise<Client> {
  if (!_dbPromise) _dbPromise = init();
  return _dbPromise;
}

async function init(): Promise<Client> {
  const client = createClient({ url, authToken });
  // 로컬 file: 모드의 cascade 삭제를 위해. (Turso는 기본 활성)
  try {
    await client.execute("PRAGMA foreign_keys = ON");
  } catch {
    // 원격에서 미지원이어도 무시
  }
  await client.executeMultiple(SCHEMA);
  return client;
}
