import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Lobby from "@/game/Lobby";
import Arena from "@/game/Arena";
import { TierId, getTier } from "@/game/tiers";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [wallet, setWallet] = useState<number>(20);
  const [activeTier, setActiveTier] = useState<TierId | null>(null);
  const [lastEarnings, setLastEarnings] = useState<number | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ss_wallet") : null;
    if (stored) setWallet(parseFloat(stored));
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ss_wallet", wallet.toFixed(2));
  }, [wallet]);

  if (activeTier) {
    const stake = getTier(activeTier).cost;
    return (
      <Arena
        tier={activeTier}
        wallet={wallet - stake}
        onExit={(newWallet, earnings) => {
          setWallet(newWallet);
          setLastEarnings(earnings);
          setActiveTier(null);
        }}
      />
    );
  }

  return (
    <Lobby
      wallet={wallet}
      lastEarnings={lastEarnings}
      onStart={(tier) => setActiveTier(tier)}
      onTopUp={() => setWallet(w => w + 20)}
    />
  );
}
