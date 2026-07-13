import { getDb } from "./db";
import { popularityScore } from "./popularity";

// 내가 구매한 게임들의 번호 패턴 진단. (예측 아님 — 선택 습관·편향·분산)

export interface UsedNumber {
  n: number;
  count: number;
  ratio: number; // 기대치 대비 배수
}

export interface MyDiagnosis {
  totalGames: number;
  modes: { auto: number; manual: number; semi: number };
  expectedPerNumber: number;
  topUsed: UsedNumber[];
  neverUsed: number[];
  highRatio: number; // 32~45 비율(%)
  lowRatio: number; // 31 이하 비율(%)
  oddAvg: number;
  lowAvg: number; // 22 이하 평균 개수
  sumAvg: number;
  avgPopularity: number;
  popBuckets: { contrarian: number; normal: number; popular: number };
  repeatedCombos: { numbers: number[]; count: number }[];
}

// 균등/역대 기준값 (거의 상수).
export const NORMS = {
  oddAvg: 3.0,
  lowAvg: 2.9,
  sumAvg: 138,
  highRatio: 31,
  lowRatio: 69,
};

interface GameRow {
  mode: string;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
}

export async function myDiagnosis(): Promise<MyDiagnosis | null> {
  const db = await getDb();
  const rs = await db.execute("SELECT mode,n1,n2,n3,n4,n5,n6 FROM games");
  const rows = rs.rows as unknown as GameRow[];
  const N = rows.length;
  if (N === 0) return null;

  const slots = N * 6;
  const expected = slots / 45;
  const freq = new Array(46).fill(0);
  const modes = { auto: 0, manual: 0, semi: 0 };
  let low31 = 0,
    low22 = 0,
    odd = 0,
    high32 = 0,
    sumT = 0;
  const sig = new Map<string, number>();
  let popSum = 0;
  const popBuckets = { contrarian: 0, normal: 0, popular: 0 };

  for (const r of rows) {
    const nums = [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6];
    if (r.mode in modes) modes[r.mode as keyof typeof modes]++;
    for (const n of nums) {
      freq[n]++;
      if (n <= 31) low31++;
      if (n <= 22) low22++;
      if (n % 2) odd++;
      if (n >= 32) high32++;
    }
    sumT += nums.reduce((a, b) => a + b, 0);
    const key = [...nums].sort((a, b) => a - b).join("-");
    sig.set(key, (sig.get(key) ?? 0) + 1);
    const sc = popularityScore(nums).score;
    popSum += sc;
    if (sc < 15) popBuckets.contrarian++;
    else if (sc < 35) popBuckets.normal++;
    else popBuckets.popular++;
  }

  const ranked = Array.from({ length: 45 }, (_, i) => ({
    n: i + 1,
    count: freq[i + 1],
  })).sort((a, b) => b.count - a.count);

  return {
    totalGames: N,
    modes,
    expectedPerNumber: expected,
    topUsed: ranked.slice(0, 5).map((x) => ({
      n: x.n,
      count: x.count,
      ratio: x.count / expected,
    })),
    neverUsed: ranked.filter((x) => x.count === 0).map((x) => x.n),
    highRatio: (high32 / slots) * 100,
    lowRatio: (low31 / slots) * 100,
    oddAvg: odd / N,
    lowAvg: low22 / N,
    sumAvg: sumT / N,
    avgPopularity: popSum / N,
    popBuckets,
    repeatedCombos: [...sig.entries()]
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([k, c]) => ({ numbers: k.split("-").map(Number), count: c })),
  };
}
