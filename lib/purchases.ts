import { getDb } from "./db";
import { assertSixNumbers } from "./validate";

export type GameMode = "auto" | "manual" | "semi";

export interface GameInput {
  slot?: string | null; // A~E
  mode: GameMode;
  numbers: number[]; // 6개
}

export interface PurchaseInput {
  round: number;
  store_id?: number | null;
  purchase_date?: string | null; // YYYY-MM-DD
  amount?: number;
  memo?: string | null;
  games: GameInput[];
}

/** 구매 1건 + 게임들을 한 트랜잭션으로 저장. purchase id 반환. */
export async function createPurchase(input: PurchaseInput): Promise<number> {
  if (!Number.isInteger(input.round) || input.round < 1)
    throw new Error("회차를 올바르게 입력하세요");
  if (!input.games?.length) throw new Error("게임을 1줄 이상 입력하세요");
  input.games.forEach((g, i) => {
    try {
      assertSixNumbers(g.numbers);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`${g.slot ?? i + 1}번 게임: ${msg}`);
    }
  });

  const db = await getDb();
  const tx = await db.transaction("write");
  try {
    const pres = await tx.execute({
      sql: `INSERT INTO purchases (round, store_id, purchase_date, amount, memo)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        input.round,
        input.store_id ?? null,
        input.purchase_date ?? null,
        input.amount ?? input.games.length * 1000,
        input.memo?.trim() || null,
      ],
    });
    const purchaseId = Number(pres.lastInsertRowid);

    for (const g of input.games) {
      const s = [...g.numbers].sort((a, b) => a - b);
      await tx.execute({
        sql: `INSERT INTO games (purchase_id, slot, mode, n1, n2, n3, n4, n5, n6)
              VALUES (?,?,?,?,?,?,?,?,?)`,
        args: [purchaseId, g.slot ?? null, g.mode, s[0], s[1], s[2], s[3], s[4], s[5]],
      });
    }
    await tx.commit();
    return purchaseId;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export interface PurchaseListRow {
  id: number;
  round: number;
  purchase_date: string | null;
  amount: number;
  store_name: string | null;
  game_count: number;
  created_at: string;
}

export async function listPurchases(
  limit = 50,
  offset = 0
): Promise<PurchaseListRow[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT p.id, p.round, p.purchase_date, p.amount, p.created_at,
                 s.name AS store_name,
                 COUNT(g.id) AS game_count
          FROM purchases p
          LEFT JOIN stores s ON s.id = p.store_id
          LEFT JOIN games g ON g.purchase_id = p.id
          GROUP BY p.id
          ORDER BY p.round DESC, p.id DESC
          LIMIT ? OFFSET ?`,
    args: [limit, offset],
  });
  return rs.rows as unknown as PurchaseListRow[];
}

export interface GameRow {
  id: number;
  slot: string | null;
  mode: GameMode;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
}

export async function gamesOfPurchase(purchaseId: number): Promise<GameRow[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: `SELECT id, slot, mode, n1, n2, n3, n4, n5, n6
          FROM games WHERE purchase_id = ? ORDER BY id`,
    args: [purchaseId],
  });
  return rs.rows as unknown as GameRow[];
}

/** 구매 1건 삭제 (게임·결과까지 트랜잭션 내 수동 cascade). */
export async function deletePurchase(id: number): Promise<void> {
  if (!Number.isInteger(id) || id < 1) throw new Error("잘못된 구매 ID");
  const db = await getDb();
  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: "DELETE FROM results WHERE game_id IN (SELECT id FROM games WHERE purchase_id=?)",
      args: [id],
    });
    await tx.execute({
      sql: "DELETE FROM games WHERE purchase_id=?",
      args: [id],
    });
    await tx.execute({ sql: "DELETE FROM purchases WHERE id=?", args: [id] });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function countPurchases(): Promise<number> {
  const db = await getDb();
  const rs = await db.execute("SELECT COUNT(*) AS c FROM purchases");
  return (rs.rows[0]?.c as number) ?? 0;
}

export async function totalSpent(): Promise<number> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT COALESCE(SUM(amount),0) AS s FROM purchases"
  );
  return (rs.rows[0]?.s as number) ?? 0;
}
