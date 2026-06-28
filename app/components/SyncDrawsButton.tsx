"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SyncDrawsButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function sync() {
    setMsg(null);
    start(async () => {
      try {
        const res = await fetch("/api/draws/sync", { method: "POST" });
        const data = await res.json();
        if (!data.ok) {
          setMsg("⚠ " + (data.error ?? "동기화 실패"));
          return;
        }
        if (data.added > 0) {
          setMsg(
            `✓ ${data.from}~${data.to}회 ${data.added}개 추가, ${data.scored}게임 재채점`
          );
          router.refresh();
        } else {
          setMsg("✓ 이미 최신입니다 (" + data.latestRound + "회)");
        }
      } catch (e) {
        setMsg("⚠ " + (e instanceof Error ? e.message : String(e)));
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      <button
        onClick={sync}
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {pending ? "가져오는 중…" : "↻ 최신 당첨번호 가져오기"}
      </button>
      {msg && (
        <span
          className={
            msg.startsWith("✓")
              ? "text-xs text-green-600"
              : "text-xs text-red-600"
          }
        >
          {msg}
        </span>
      )}
    </span>
  );
}
