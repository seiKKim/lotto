"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

const SEOUL = { lat: 37.5663, lng: 126.9779 };

interface Store {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceM: number;
  won: boolean;
  winCount: number;
}
type Tab = "all" | "won" | "none";

function dist(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

export function NearbyStores() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [status, setStatus] = useState("위치 확인 중…");
  const [tab, setTab] = useState<Tab>("all");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<LeafletMap | null>(null);

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (!navigator.geolocation) return useDefault("위치 미지원 — 서울시청 기준");
    setStatus("위치 확인 중…");
    navigator.geolocation.getCurrentPosition(
      (p) => load({ lat: p.coords.latitude, lng: p.coords.longitude }, ""),
      () => useDefault("위치 권한 거부됨 — 서울시청 기준으로 표시"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
  function useDefault(msg: string) {
    load(SEOUL, msg);
  }
  async function load(c: { lat: number; lng: number }, msg: string) {
    setCoords(c);
    setStatus(msg || "판매점 검색 중…");
    try {
      const r = await fetch(
        `/api/stores/nearby?lat=${c.lat}&lng=${c.lng}&radius=2000`
      );
      const d = await r.json();
      if (d.ok) {
        setStores(d.stores);
        setStatus(msg);
      } else {
        setStores([]);
        setStatus(
          d.error === "kakao_disabled"
            ? "미배출 탭은 서버에 Kakao 키가 필요합니다."
            : "불러오기 실패: " + (d.message ?? d.error)
        );
      }
    } catch (e) {
      setStores([]);
      setStatus("불러오기 실패: " + (e instanceof Error ? e.message : e));
    }
  }

  const counts = useMemo(() => {
    const won = stores?.filter((s) => s.won).length ?? 0;
    const all = stores?.length ?? 0;
    return { all, won, none: all - won };
  }, [stores]);

  const shown = useMemo(
    () =>
      (stores ?? []).filter((s) =>
        tab === "all" ? true : tab === "won" ? s.won : !s.won
      ),
    [stores, tab]
  );

  // 지도
  useEffect(() => {
    if (!coords || !mapRef.current) return;
    let alive = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!alive || !mapRef.current) return;
      if (mapObj.current) mapObj.current.remove();
      const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 15);
      mapObj.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        color: "#2563eb",
        fillColor: "#3b82f6",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup("📍 내 위치");
      for (const s of shown) {
        L.circleMarker([s.lat, s.lng], {
          radius: s.won ? 6 + Math.min(6, s.winCount) : 6,
          color: s.won ? "#b91c1c" : "#6b7280",
          fillColor: s.won ? "#ef4444" : "#9ca3af",
          fillOpacity: 0.8,
        })
          .addTo(map)
          .bindPopup(
            `<b>${s.name}</b><br>${s.address}<br>${
              s.won ? `1등 ${s.winCount}회 배출` : "1등 배출 기록 없음"
            }`
          );
      }
    })();
    return () => {
      alive = false;
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [coords, shown]);

  const TABS: { key: Tab; label: string; n: number }[] = [
    { key: "all", label: "전체", n: counts.all },
    { key: "won", label: "1등 배출", n: counts.won },
    { key: "none", label: "미배출", n: counts.none },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 주변 로또방</h1>
        <button
          onClick={locate}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          ↻ 내 위치로
        </button>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-300 bg-white text-neutral-600"
            }`}
          >
            {t.label}{" "}
            <span className={tab === t.key ? "opacity-80" : "text-neutral-400"}>
              {t.n}
            </span>
          </button>
        ))}
      </div>

      {status && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {status}
        </p>
      )}

      <div
        ref={mapRef}
        className="h-80 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
      />

      {stores && (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {shown.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-neutral-400">
              해당하는 판매점이 없습니다.
            </li>
          )}
          {shown.map((s, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  s.won ? "bg-red-500" : "bg-neutral-400"
                }`}
              />
              <div className="flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-neutral-400">{s.address}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold text-blue-600">{dist(s.distanceM)}</div>
                <div
                  className={`text-xs ${
                    s.won ? "text-red-500" : "text-neutral-400"
                  }`}
                >
                  {s.won ? `1등 ${s.winCount}회` : "배출 기록 없음"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-neutral-400">
        ※ 배출/미배출은 과거 기록일 뿐, 다음 당첨과 무관합니다(추첨은 무작위).
        판매점 검색은 Kakao, 반경 2km 내 복권 취급점 기준입니다.
      </p>
    </div>
  );
}
