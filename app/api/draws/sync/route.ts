import { NextResponse } from "next/server";
import { syncFromSmok95 } from "@/lib/smok95Sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/draws/sync → smok95에서 신규 회차 당첨번호를 가져와 저장+재채점.
export async function POST() {
  try {
    const result = await syncFromSmok95();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
