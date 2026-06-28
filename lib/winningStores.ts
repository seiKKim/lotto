import { getDb } from "./db";

export interface WinningStore {
  name: string;
  address: string;
  lat: number;
  lng: number;
  win_count: number;
  last_round: number | null;
}

export interface NearbyStore extends WinningStore {
  distanceKm: number;
}

/** 하버사인 거리(km). */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 내 위치에서 가까운 1등 배출점 N곳 (거리순). */
export async function nearbyWinningStores(
  lat: number,
  lng: number,
  limit = 30
): Promise<NearbyStore[]> {
  const db = await getDb();
  const rs = await db.execute(
    "SELECT name, address, lat, lng, win_count, last_round FROM winning_stores"
  );
  const stores = rs.rows as unknown as WinningStore[];
  return stores
    .map((s) => ({ ...s, distanceKm: haversineKm(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export async function countWinningStores(): Promise<number> {
  const db = await getDb();
  const rs = await db.execute("SELECT COUNT(*) AS c FROM winning_stores");
  return (rs.rows[0]?.c as number) ?? 0;
}
