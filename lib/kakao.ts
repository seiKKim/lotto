// Kakao 로컬 키워드 검색 — 내 주변 로또(복권) 판매점.
const KEY = process.env.KAKAO_REST_KEY;

export function kakaoEnabled(): boolean {
  return !!KEY;
}

export interface KakaoStore {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceM: number;
  category: string;
}

/** 내 주변 복권 취급점 검색 (여러 키워드/페이지 합쳐 중복 제거, 거리순). */
export async function searchLottoStores(
  lat: number,
  lng: number,
  radius = 2000
): Promise<KakaoStore[]> {
  if (!KEY) throw new Error("KAKAO_REST_KEY가 설정되지 않았습니다");
  const out: KakaoStore[] = [];
  const seen = new Set<string>();

  for (const q of ["로또", "복권"]) {
    for (let page = 1; page <= 3; page++) {
      const url =
        `https://dapi.kakao.com/v2/local/search/keyword.json` +
        `?query=${encodeURIComponent(q)}&x=${lng}&y=${lat}` +
        `&radius=${radius}&sort=distance&size=15&page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) break;
      const j = (await res.json()) as {
        documents?: {
          id?: string;
          place_name: string;
          road_address_name?: string;
          address_name?: string;
          category_name?: string;
          x: string;
          y: string;
          distance?: string;
        }[];
        meta?: { is_end?: boolean };
      };
      for (const d of j.documents ?? []) {
        // 복권 취급 카테고리(로또방)만. (편의점/마트는 제외)
        if (!/복권/.test(d.category_name ?? "")) continue;
        const key = d.id ?? `${d.place_name}|${d.x}|${d.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          name: d.place_name,
          address: d.road_address_name || d.address_name || "",
          lat: parseFloat(d.y),
          lng: parseFloat(d.x),
          distanceM: parseInt(d.distance ?? "0", 10),
          category: d.category_name ?? "",
        });
      }
      if (j.meta?.is_end) break;
    }
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}
