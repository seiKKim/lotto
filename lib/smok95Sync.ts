import { upsertDraws, latestRound, type DrawRow } from "./draws";
import { scoreAllPurchasedRounds } from "./score";

// 공식 API가 차단돼, 검증된 공개 데이터셋 smok95/lotto(GitHub raw)에서 신규 회차를
// 가져온다. raw.githubusercontent.com 은 서버에서도 막힘없이 접근된다.
const BASE = "https://raw.githubusercontent.com/smok95/lotto/main/results";

interface Smok95Json {
  draw_no: number;
  numbers: number[];
  bonus_no: number;
  date: string;
  divisions?: { prize?: number; winners?: number }[];
  total_sales_amount?: number;
}

// 1등 = divisions 중 1게임당 상금(prize)이 최대인 항목.
function firstDivision(divs?: { prize?: number; winners?: number }[]) {
  let best: { prize: number; winners: number } | null = null;
  for (const d of divs ?? []) {
    if (d && typeof d.prize === "number" && typeof d.winners === "number") {
      if (!best || d.prize > best.prize)
        best = { prize: d.prize, winners: d.winners };
    }
  }
  return best ?? { prize: null as number | null, winners: null as number | null };
}

async function fetchRound(round: number): Promise<DrawRow | null> {
  const res = await fetch(`${BASE}/${round}.json`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null; // 아직 없는 회차
  if (!res.ok) throw new Error(`smok95 ${round}회 응답 오류 ${res.status}`);
  const j = (await res.json()) as Smok95Json;
  if (!Array.isArray(j.numbers) || j.numbers.length !== 6) return null;
  const n = [...j.numbers].sort((a, b) => a - b);
  const fd = firstDivision(j.divisions);
  return {
    round: j.draw_no,
    draw_date: String(j.date).slice(0, 10),
    n1: n[0],
    n2: n[1],
    n3: n[2],
    n4: n[3],
    n5: n[4],
    n6: n[5],
    bonus: j.bonus_no,
    first_winners: fd.winners,
    first_prize: fd.prize,
    total_sales: j.total_sales_amount ?? null,
  };
}

export interface SyncResult {
  added: number; // 새로 가져온 회차 수
  from: number;
  to: number;
  scored: number; // 재채점된 게임 수
  latestRound: number;
}

/** DB 최신 회차 다음부터 smok95에 있는 데까지 가져와 저장 후, 구매 회차 재채점. */
export async function syncFromSmok95(maxFetch = 30): Promise<SyncResult> {
  const start = (await latestRound()) + 1;
  const rows: DrawRow[] = [];
  let to = start - 1;
  for (let r = start; r < start + maxFetch; r++) {
    const d = await fetchRound(r);
    if (!d) break; // 더 없는 회차 → 종료
    rows.push(d);
    to = r;
  }
  if (rows.length > 0) await upsertDraws(rows);
  const scored = rows.length > 0 ? await scoreAllPurchasedRounds() : 0;
  return {
    added: rows.length,
    from: start,
    to,
    scored,
    latestRound: await latestRound(),
  };
}
