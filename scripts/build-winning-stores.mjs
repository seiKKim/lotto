// smok95 winning-stores/*.json → 집계 → data/seed/winning-stores.json
// 같은 판매점(name+address)을 합쳐 1등 배출 횟수/최근 회차 기록. 온라인 채널 제외.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2] ?? "data/_import/lotto-main/winning-stores";
const out = process.argv[3] ?? "data/seed/winning-stores.json";

const files = fs
  .readdirSync(dir)
  .filter((f) => /^[0-9]+\.json$/.test(f))
  .sort((a, b) => parseInt(a) - parseInt(b));

const map = new Map();
for (const f of files) {
  const round = parseInt(f);
  let arr;
  try {
    arr = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  } catch {
    continue;
  }
  if (!Array.isArray(arr)) continue;
  for (const s of arr) {
    if (typeof s.lat !== "number" || typeof s.lng !== "number") continue;
    // 온라인 판매(동행복권 사이트)는 물리 매장이 아니므로 제외
    if (/dhlottery|인터넷\s*복권/i.test(`${s.name} ${s.address}`)) continue;
    const key = `${s.name}|${s.address}`;
    const cur = map.get(key);
    if (cur) {
      cur.win_count++;
      cur.last_round = Math.max(cur.last_round, round);
    } else {
      map.set(key, {
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        win_count: 1,
        last_round: round,
      });
    }
  }
}

const list = [...map.values()].sort((a, b) => b.win_count - a.win_count);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(list));
console.log(`wrote ${list.length} stores → ${out}`);
