"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import type { NearbyStore } from "@/lib/winningStores";

const SEOUL = { lat: 37.5663, lng: 126.9779 }; // 위치 거부 시 기본값

export function NearbyWinningStores() {
  const [stores, setStores] = useState<NearbyStore[] | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [status, setStatus] = useState("위치 확인 중…");
  const [fallback, setFallback] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<LeafletMap | null>(null);

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (!navigator.geolocation) {
      useDefault("이 브라우저는 위치를 지원하지 않습니다.");
      return;
    }
    setStatus("위치 확인 중…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFallback(false);
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c);
        fetchNearby(c);
      },
      () => useDefault("위치 권한이 거부됐습니다. 서울시청 기준으로 표시합니다."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
  function useDefault(msg: string) {
    setFallback(true);
    setStatus(msg);
    setCoords(SEOUL);
    fetchNearby(SEOUL);
  }

  async function fetchNearby(c: { lat: number; lng: number }) {
    const r = await fetch(
      `/api/winning-stores/nearby?lat=${c.lat}&lng=${c.lng}&limit=50`
    );
    const d = await r.json();
    if (d.ok) {
      setStores(d.stores);
      if (!fallback) setStatus("");
    } else setStatus(d.error ?? "불러오기 실패");
  }

  // 지도 렌더
  useEffect(() => {
    if (!coords || !stores || !mapRef.current) return;
    let alive = true;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!alive || !mapRef.current) return;
      if (mapObj.current) mapObj.current.remove();
      const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 13);
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
      for (const s of stores) {
        L.circleMarker([s.lat, s.lng], {
          radius: 5 + Math.min(6, s.win_count),
          color: "#b91c1c",
          fillColor: "#ef4444",
          fillOpacity: 0.75,
        })
          .addTo(map)
          .bindPopup(
            `<b>${s.name}</b><br>${s.address}<br>1등 ${s.win_count}회`
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
  }, [coords, stores]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">내 주변 1등 명당</h1>
        <button
          onClick={locate}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          ↻ 내 위치로
        </button>
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
          {stores.map((s, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-sm font-bold text-neutral-400">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-neutral-400">{s.address}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold text-blue-600">
                  {s.distanceKm < 1
                    ? `${Math.round(s.distanceKm * 1000)}m`
                    : `${s.distanceKm.toFixed(1)}km`}
                </div>
                <div className="text-xs text-red-500">1등 {s.win_count}회</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-neutral-400">
        ※ 과거 1등 배출 기록일 뿐, 그 매장에서 또 나올 확률이 높다는 뜻은
        아닙니다. 추첨은 무작위입니다.
      </p>
    </div>
  );
}
