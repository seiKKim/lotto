import { getDb } from "./db";
import { searchLottoStores } from "./kakao";

export interface TaggedStore {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceM: number;
  won: boolean; // 1등 배출 이력 있음
  winCount: number;
}

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

interface WinnerPt {
  lat: number;
  lng: number;
  win_count: number;
}

// 반경 근처 1등 배출점만 bbox로 로드(태깅용).
async function winnersNear(
  lat: number,
  lng: number,
  radiusM: number
): Promise<WinnerPt[]> {
  const db = await getDb();
  const dLat = radiusM / 111000 + 0.005;
  const dLng = radiusM / (111000 * Math.cos((lat * Math.PI) / 180)) + 0.005;
  const rs = await db.execute({
    sql: `SELECT lat, lng, win_count FROM winning_stores
          WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`,
    args: [lat - dLat, lat + dLat, lng - dLng, lng + dLng],
  });
  return rs.rows as unknown as WinnerPt[];
}

const MATCH_M = 40; // 이 거리 안에 배출점이 있으면 같은 곳으로 본다

/** 내 주변 로또방 목록 + 각 점의 1등 배출 여부 태깅. */
export async function nearbyTaggedStores(
  lat: number,
  lng: number,
  radius = 2000
): Promise<TaggedStore[]> {
  const [stores, winners] = await Promise.all([
    searchLottoStores(lat, lng, radius),
    winnersNear(lat, lng, radius),
  ]);
  return stores.map((s) => {
    let winCount = 0;
    for (const w of winners) {
      if (haversineM(s.lat, s.lng, w.lat, w.lng) <= MATCH_M) {
        if (w.win_count > winCount) winCount = w.win_count;
      }
    }
    return { ...s, won: winCount > 0, winCount };
  });
}
