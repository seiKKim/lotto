import { numberFrequencies, distroStats } from "@/lib/stats";
import { NumberAnalyzer } from "../components/NumberAnalyzer";
import { FrequencyChart } from "../components/FrequencyChart";
import { RecommendBox } from "../components/RecommendBox";
import { MyDiagnosisSection } from "../components/MyDiagnosisSection";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const [{ freqs, totalDraws }, d] = await Promise.all([
    numberFrequencies(),
    distroStats(),
  ]);

  const hot = [...freqs].sort((a, b) => b.count - a.count).slice(0, 6);
  const cold = [...freqs].sort((a, b) => a.count - b.count).slice(0, 6);
  const maxBucket = Math.max(...d.sumBuckets.map((b) => b.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">분석</h1>

      <RecommendBox />

      <MyDiagnosisSection />

      <NumberAnalyzer />

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">번호별 출현 빈도</h2>
          <span className="text-sm text-neutral-400">
            전 {totalDraws}회 누적
          </span>
        </div>
        <FrequencyChart freqs={freqs} />
        <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
          <div>
            <span className="text-neutral-500">최다 출현</span>{" "}
            <b>{hot.map((f) => `${f.n}(${f.count})`).join(", ")}</b>
          </div>
          <div>
            <span className="text-neutral-500">최소 출현</span>{" "}
            <b>{cold.map((f) => `${f.n}(${f.count})`).join(", ")}</b>
          </div>
        </div>
        <p className="text-xs text-amber-600">
          ⚠️ 과거 빈도일 뿐, 다음 회차 확률과는 무관합니다. (각 번호 1/45 동일)
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-bold">분포 통계</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Box
            label="평균 홀:짝"
            value={`${d.oddAvg.toFixed(1)} : ${(6 - d.oddAvg).toFixed(1)}`}
          />
          <Box
            label="평균 저:고 (≤22)"
            value={`${d.lowAvg.toFixed(1)} : ${(6 - d.lowAvg).toFixed(1)}`}
          />
          <Box
            label="합계 평균"
            value={`${Math.round(d.sumAvg)} (${d.sumMin}~${d.sumMax})`}
          />
        </div>
        <div>
          <div className="mb-1 text-sm text-neutral-500">6개 합계 분포</div>
          <div className="space-y-1">
            {d.sumBuckets.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-right text-neutral-500">
                  {b.label}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-100">
                  <div
                    className="h-full rounded bg-blue-400"
                    style={{ width: `${(b.count / maxBucket) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-neutral-500">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-0.5 font-bold">{value}</div>
    </div>
  );
}
