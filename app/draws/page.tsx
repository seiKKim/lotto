import { countDraws, listDraws } from "@/lib/draws";
import { LottoBalls } from "../components/LottoBalls";
import { SyncDrawsButton } from "../components/SyncDrawsButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function DrawsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const total = await countDraws();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = await listDraws(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">당첨번호 ({total}회)</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-neutral-500">
            {page} / {pages} 페이지
          </span>
          <SyncDrawsButton />
          <a
            href="/draws/new"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            + 수동 입력
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <ul className="divide-y divide-neutral-100">
          {rows.map((d) => (
            <li
              key={d.round}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="w-24 shrink-0">
                <span className="font-medium">{d.round}회</span>
                <span className="block text-xs text-neutral-400">
                  {d.draw_date}
                </span>
              </span>
              <LottoBalls
                numbers={[d.n1, d.n2, d.n3, d.n4, d.n5, d.n6]}
                bonus={d.bonus}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between">
        <PageLink page={page - 1} disabled={page <= 1}>
          ← 이전
        </PageLink>
        <PageLink page={page + 1} disabled={page >= pages}>
          다음 →
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-300">
        {children}
      </span>
    );
  }
  return (
    <a
      href={`/draws?page=${page}`}
      className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50"
    >
      {children}
    </a>
  );
}
