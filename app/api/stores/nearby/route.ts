import { NextResponse } from "next/server";
import { kakaoEnabled } from "@/lib/kakao";
import { nearbyTaggedStores } from "@/lib/nearbyStores";

export const dynamic = "force-dynamic";

// GET /api/stores/nearby?lat&lng&radius → 내 주변 로또방(배출/미배출 태깅)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const radius = Math.min(
    20000,
    parseInt(searchParams.get("radius") ?? "2000") || 2000
  );

  if (!kakaoEnabled()) {
    return NextResponse.json(
      { ok: false, error: "kakao_disabled", message: "Kakao 키가 설정되지 않았습니다" },
      { status: 503 }
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { ok: false, error: "위치(lat,lng)가 필요합니다" },
      { status: 400 }
    );
  }
  try {
    const stores = await nearbyTaggedStores(lat, lng, radius);
    return NextResponse.json({ ok: true, stores });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
