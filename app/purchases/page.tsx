import { listPurchases, gamesOfPurchase } from "@/lib/purchases";
import { resultsOfPurchase } from "@/lib/score";
import { getDraw, type DrawRow } from "@/lib/draws";
import { LottoBalls } from "../components/LottoBalls";
import { RankBadge } from "../components/RankBadge";
import { DeletePurchaseButton } from "../components/DeletePurchaseButton";

export const dynamic = "force-dynamic";

const MODE_LABEL: Record<string, string> = {
  auto: "자동",
  manual: "수동",
  semi: "반자동",
};

export default async function PurchasesPage() {
  const purchases = await listPurchases();

  // 구매 회차들의 당첨번호를 한 번씩만 조회해 맵으로.
  const rounds = [...new Set(purchases.map((p) => p.round))];
  const drawList = await Promise.all(rounds.map((r) => getDraw(r)));
  const draws = new Map<number, DrawRow>();
  drawList.forEach((d) => {
    if (d) draws.set(d.round, d);
  });

  const details = await Promise.all(
    purchases.map(async (p) => ({
      p,
      games: await gamesOfPurchase(p.id),
      results: await resultsOfPurchase(p.id),
      draw: draws.get(p.round),
    }))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">내 구매 ({purchases.length})</h1>
        <a
          href="/purchases/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          + 구매 등록
        </a>
      </div>

      {purchases.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          아직 등록된 구매가 없습니다. 오른쪽 위 “구매 등록”으로 추가하세요.
        </p>
      ) : (
        <div className="space-y-3">
          {details.map(({ p, games, results, draw }) => {
            const scored = results.size > 0;
            const winning = draw
              ? [draw.n1, draw.n2, draw.n3, draw.n4, draw.n5, draw.n6]
              : undefined;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-neutral-200 bg-white p-4"
              >
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-bold">
                    {p.round}회{" "}
                    <span className="font-normal text-neutral-500">
                      · {p.store_name ?? "판매점 미지정"}
                    </span>
                    {!scored && (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-500">
                        추첨 전 (미채점)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500">
                      {p.purchase_date ?? ""} · {p.game_count}게임 ·{" "}
                      {p.amount.toLocaleString("ko-KR")}원
                    </span>
                    <DeletePurchaseButton
                      id={p.id}
                      label={`${p.round}회 · ${p.store_name ?? "판매점 미지정"}`}
                    />
                  </div>
                </div>
                {draw && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs">
                    <span className="text-neutral-500">당첨번호</span>
                    <LottoBalls
                      numbers={winning!}
                      bonus={draw.bonus}
                    />
                  </div>
                )}
                <ul className="space-y-1.5">
                  {games.map((g) => {
                    const r = results.get(g.id);
                    return (
                      <li
                        key={g.id}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span className="w-4 text-xs font-bold text-neutral-400">
                          {g.slot}
                        </span>
                        <span className="w-10 text-xs text-neutral-500">
                          {MODE_LABEL[g.mode] ?? g.mode}
                        </span>
                        <LottoBalls
                          numbers={[g.n1, g.n2, g.n3, g.n4, g.n5, g.n6]}
                          winning={winning}
                          winningBonus={draw?.bonus}
                        />
                        {r && (
                          <RankBadge
                            rank={r.rank}
                            matchCount={r.match_count}
                            bonusMatch={r.bonus_match === 1}
                            prize={r.prize}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
