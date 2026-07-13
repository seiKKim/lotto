"use client";

import { useEffect, useState, useTransition } from "react";
import { recommendAction, recoCommentAction } from "../actions";
import { LottoBalls } from "./LottoBalls";
import type { Recommendation } from "@/lib/recommend";
import type { RecoComment } from "@/lib/recoComment";

export function RecommendBox() {
  const [reco, setReco] = useState<Recommendation | null>(null);
  const [comment, setComment] = useState<RecoComment | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [pending, start] = useTransition();

  function refresh() {
    setComment(null);
    start(async () => {
      const r = await recommendAction();
      setReco(r);
      // 로컬 LLM 멘트는 별도로(느릴 수 있어 번호부터 보여줌).
      setCommenting(true);
      try {
        setComment(await recoCommentAction(r));
      } finally {
        setCommenting(false);
      }
    });
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">
          🎲 금주 추천번호{" "}
          {reco && (
            <span className="text-sm font-normal text-neutral-500">
              {reco.round}회
            </span>
          )}
        </h2>
        <button
          onClick={refresh}
          disabled={pending}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40"
        >
          {pending ? "뽑는 중…" : "다시 추천"}
        </button>
      </div>

      {!reco ? (
        <p className="text-sm text-neutral-400">추천을 생성하는 중…</p>
      ) : (
        <>
          <ul className="space-y-2">
            {reco.sets.map((s, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-2 first:border-0 first:pt-0"
              >
                <span className="w-5 text-sm font-bold text-neutral-400">
                  {i + 1}
                </span>
                <LottoBalls numbers={s.numbers} />
                <span className="ml-auto flex items-center gap-2 text-xs">
                  <span className="text-neutral-500">
                    대중성 {s.popularity}
                  </span>
                  {s.avoidsOveruse && (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                      분산 ✓
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {commenting && (
            <p className="text-xs text-neutral-400">🤖 로컬 AI가 분석 중…</p>
          )}
          {comment && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
              <div className="mb-1 font-medium text-indigo-500">
                🤖 로컬 AI 분석{" "}
                <span className="font-normal opacity-60">({comment.model})</span>
              </div>
              {comment.text}
            </div>
          )}

          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
            🎯 <b>완전 분산 구성</b> — 5게임이 서로 번호를 안 겹치게(45개 중{" "}
            <b>{reco.coverage}개</b> 커버) 골랐습니다. 게임들이 같은 번호에서 다
            같이 빗나가지 않아, <b>이번 주 최소 하나라도 맞을 확률</b>이 겹쳐 살
            때(약 8.8%)보다 높아집니다(약 11.9%).{" "}
            <span className="opacity-70">
              단, 평균 적중 개수·당첨 확률 자체는 동일합니다.
            </span>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ 이 추천은 <b>당첨 확률을 높이지 않습니다</b> (어떤 6개든 확률
            동일). ① 인기조합 점수가 낮아 <b>당첨 시 상금 분배 위험이 적고</b>, ②
            회원님이 자주 쓰는 번호
            {reco.overusedAvoided.length > 0 && (
              <>
                {" "}
                (<b>{reco.overusedAvoided.join(", ")}</b>)
              </>
            )}
            와 이미 산 조합을 피해 <b>분산</b>되도록 고른 것뿐입니다.
            {reco.basedOnGames > 0 && (
              <> (내 {reco.basedOnGames}게임 기준)</>
            )}
          </div>
        </>
      )}
    </section>
  );
}
