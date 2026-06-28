import { countWinningStores } from "@/lib/winningStores";
import { NearbyWinningStores } from "../components/NearbyWinningStores";

export const dynamic = "force-dynamic";

export default async function WinningStoresPage() {
  const total = await countWinningStores();
  return (
    <div className="space-y-3">
      <NearbyWinningStores />
      <p className="text-center text-xs text-neutral-400">
        전국 1등 배출점 {total.toLocaleString("ko-KR")}곳 수록
      </p>
    </div>
  );
}
