import { myDiagnosis, NORMS } from "@/lib/myDiagnosis";
import { LottoBalls } from "./LottoBalls";

function nearNorm(v: number, norm: number, tol: number): boolean {
  return Math.abs(v - norm) <= tol;
}

export async function MyDiagnosisSection() {
  const d = await myDiagnosis();
  if (!d) return null; // 구매 없으면 표시 안 함

  const popLevel =
    d.avgPopularity < 15
      ? { label: "매우 독창적", color: "text-green-600" }
      : d.avgPopularity < 35
        ? { label: "보통", color: "text-neutral-700" }
        : { label: "대중적", color: "text-orange-600" };

  const rows: { label: string; value: string; ok: boolean; norm: string }[] = [
    {
      label: "홀 : 짝",
      value: `${d.oddAvg.toFixed(1)} : ${(6 - d.oddAvg).toFixed(1)}`,
      ok: nearNorm(d.oddAvg, NORMS.oddAvg, 0.5),
      norm: "3 : 3",
    },
    {
      label: "저(≤22) : 고",
      value: `${d.lowAvg.toFixed(1)} : ${(6 - d.lowAvg).toFixed(1)}`,
      ok: nearNorm(d.lowAvg, NORMS.lowAvg, 0.6),
      norm: "2.9 : 3.1",
    },
    {
      label: "6개 합계",
      value: `${Math.round(d.sumAvg)}`,
      ok: nearNorm(d.sumAvg, NORMS.sumAvg, 12),
      norm: "138",
    },
    {
      label: "고번호(32~45)",
      value: `${d.highRatio.toFixed(0)}%`,
      ok: nearNorm(d.highRatio, NORMS.highRatio, 6),
      norm: "31%",
    },
  ];

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">🩺 내 번호 진단</h2>
        <span className="text-sm text-neutral-400">
          {d.totalGames}게임 (자동 {d.modes.auto}·수동 {d.modes.manual}·반자동{" "}
          {d.modes.semi})
        </span>
      </div>

      {/* 분포 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">{r.label}</div>
            <div className="mt-0.5 flex items-center gap-1 font-bold">
              {r.value}
              <span className={r.ok ? "text-green-500" : "text-orange-500"}>
                {r.ok ? "✓" : "⚠"}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">기준 {r.norm}</div>
          </div>
        ))}
      </div>

      {/* 인기조합 */}
      <div className="rounded-lg bg-neutral-50 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-600">인기조합 점수(평균)</span>
          <span className={`font-bold ${popLevel.color}`}>
            {d.avgPopularity.toFixed(1)} / 100 · {popLevel.label}
          </span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          독창 {d.popBuckets.contrarian} · 보통 {d.popBuckets.normal} · 대중{" "}
          {d.popBuckets.popular}게임 — 낮을수록 당첨 시 상금 분배 위험이 적음
        </div>
      </div>

      {/* 과의존 번호 */}
      <div>
        <div className="mb-1 text-sm text-neutral-600">
          자주 쓰는 번호{" "}
          <span className="text-xs text-neutral-400">
            (슬롯당 기대 {d.expectedPerNumber.toFixed(1)}회)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {d.topUsed.map((u) => (
            <span
              key={u.n}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-sm"
            >
              <b>{u.n}</b>
              <span className="text-xs text-neutral-500">
                {u.count}회 · {u.ratio.toFixed(1)}배
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* 반복 조합 */}
      {d.repeatedCombos.length > 0 && (
        <div>
          <div className="mb-1 text-sm text-neutral-600">
            반복 사용 조합{" "}
            <span className="text-xs text-orange-500">
              ({d.repeatedCombos.length}종 — 다양화 권장)
            </span>
          </div>
          <ul className="space-y-1.5">
            {d.repeatedCombos.slice(0, 5).map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <LottoBalls numbers={c.numbers} />
                <span className="text-xs font-medium text-orange-500">
                  ×{c.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-neutral-400">
        ※ 진단은 내 선택 습관·분산을 보는 것이며 당첨 확률과 무관합니다. 어떤
        조합도 확률은 동일합니다.
      </p>
    </section>
  );
}
