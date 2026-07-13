import { getDb } from "./db";
import { popularityScore } from "./popularity";

// ⚠️ 추천번호는 당첨 확률을 높이지 못한다(어떤 조합이든 동일).
// 목적: ① 인기조합 회피로 당첨 시 상금 분배 위험↓ ② 사용자가 과의존하는
// 번호/이미 쓴 조합을 피해 커버리지 분산.

export interface RecoSet {
  numbers: number[];
  popularity: number; // 0~100, 낮을수록 비대중적(좋음)
  avoidsOveruse: boolean; // 과의존 번호를 안 쓴 조합인가
}

export interface Recommendation {
  round: number;
  basedOnGames: number;
  overusedAvoided: number[]; // 회피 대상으로 삼은 과의존 번호
  coverage: number; // 5세트가 커버하는 서로 다른 번호 개수(완전 분산이면 30)
  sets: RecoSet[];
}

interface Profile {
  comboSet: Set<string>;
  overuse: Set<number>;
  overuseList: number[];
  totalGames: number;
}

async function userProfile(): Promise<Profile> {
  const db = await getDb();
  const rs = await db.execute("SELECT n1,n2,n3,n4,n5,n6 FROM games");
  const usage = new Array(46).fill(0);
  const comboSet = new Set<string>();
  for (const r of rs.rows) {
    const nums = [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6].map(Number);
    for (const n of nums) usage[n]++;
    comboSet.add([...nums].sort((a, b) => a - b).join("-"));
  }
  // 기대치(슬롯당)의 1.8배 넘게 쓴 번호를 '과의존'으로 본다.
  const slots = rs.rows.length * 6;
  const expected = slots > 0 ? slots / 45 : 0;
  const ranked = Array.from({ length: 45 }, (_, i) => ({
    n: i + 1,
    c: usage[i + 1],
  })).sort((a, b) => b.c - a.c);
  const overuseList = ranked
    .filter((x) => expected > 0 && x.c >= expected * 1.8)
    .slice(0, 6)
    .map((x) => x.n);
  return {
    comboSet,
    overuse: new Set(overuseList),
    overuseList,
    totalGames: rs.rows.length,
  };
}

function randomCombo(): number[] {
  const pool = Array.from({ length: 45 }, (_, i) => i + 1);
  for (let i = 0; i < 6; i++) {
    const j = i + Math.floor(Math.random() * (45 - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 6).sort((a, b) => a - b);
}

/** 금주(다음) 회차 추천 조합 생성. */
export async function recommend(count = 5): Promise<Recommendation> {
  const db = await getDb();
  const lr = await db.execute("SELECT MAX(round) AS m FROM draws");
  const round = ((lr.rows[0]?.m as number | null) ?? 0) + 1;

  const prof = await userProfile();

  // 후보 다량 생성 → 점수화(낮을수록 좋음). 완전 분산 선택을 위해 넉넉히.
  const CAND = 8000;
  const seen = new Set<string>();
  const scored: { nums: number[]; pop: number; overuseHits: number; rank: number }[] =
    [];
  for (let i = 0; i < CAND; i++) {
    const nums = randomCombo();
    const key = nums.join("-");
    if (seen.has(key)) continue;
    seen.add(key);
    if (prof.comboSet.has(key)) continue; // 이미 쓴 조합 제외
    const pop = popularityScore(nums).score;
    const overuseHits = nums.filter((n) => prof.overuse.has(n)).length;
    scored.push({ nums, pop, overuseHits, rank: pop + overuseHits * 8 });
  }
  scored.sort((a, b) => a.rank - b.rank);

  // 완전 분산: 세트끼리 번호를 하나도 공유하지 않게 선택한다.
  // → 5게임이 '같은 번호에서 다 같이 빗나가는' 걸 막아, 최소 1게임 적중 확률↑.
  // (평균 적중 개수·당첨 확률·기대값은 불변. 시뮬레이션: 겹침 8.8% → 분산 11.9%)
  const picks: typeof scored = [];
  const usedNums = new Set<number>();
  for (const c of scored) {
    if (picks.length >= count) break;
    if (c.nums.some((n) => usedNums.has(n))) continue; // 이미 쓴 번호 겹침 → 스킵
    picks.push(c);
    for (const n of c.nums) usedNums.add(n);
  }

  // (희박) 후보에서 5세트를 못 채우면 남은 번호로 구성.
  if (picks.length < count) {
    const remaining = [];
    for (let n = 1; n <= 45; n++) if (!usedNums.has(n)) remaining.push(n);
    while (picks.length < count && remaining.length >= 6) {
      const nums = remaining.splice(0, 6).sort((a, b) => a - b);
      picks.push({ nums, pop: popularityScore(nums).score, overuseHits: 0, rank: 0 });
      for (const n of nums) usedNums.add(n);
    }
  }

  return {
    round,
    basedOnGames: prof.totalGames,
    overusedAvoided: prof.overuseList,
    coverage: usedNums.size,
    sets: picks.map((p) => ({
      numbers: p.nums,
      popularity: p.pop,
      avoidsOveruse: p.overuseHits === 0,
    })),
  };
}
