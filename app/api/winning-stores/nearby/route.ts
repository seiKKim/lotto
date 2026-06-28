import { NextResponse } from "next/server";
import { nearbyWinningStores } from "@/lib/winningStores";

export const dynamic = "force-dynamic";

// GET /api/winning-stores/nearby?lat=..&lng=..&limit=..
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "30") || 30);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { ok: false, error: "위치(lat,lng)가 필요합니다" },
      { status: 400 }
    );
  }
  try {
    const stores = await nearbyWinningStores(lat, lng, limit);
    return NextResponse.json({ ok: true, stores });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
