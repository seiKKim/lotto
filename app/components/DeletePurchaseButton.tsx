"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePurchaseAction } from "../actions";

export function DeletePurchaseButton({
  id,
  label,
}: {
  id: number;
  label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    if (!confirm(`${label} 구매를 삭제할까요?\n게임·채점 결과까지 함께 삭제되며 되돌릴 수 없습니다.`))
      return;
    start(async () => {
      const res = await deletePurchaseAction(id);
      if (res.ok) router.refresh();
      else alert("삭제 실패: " + res.error);
    });
  }

  return (
    <button
      onClick={onDelete}
      disabled={pending}
      className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-400 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
    >
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
