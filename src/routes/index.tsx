import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Lobby from "@/game/Lobby";
import Arena from "@/game/Arena";
import ModeSelect from "@/game/ModeSelect";
import { GameMode } from "@/game/engine";
import { TierId, getTier } from "@/game/tiers";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [wallet, setWallet] = useState<number>(20);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [activeTier, setActiveTier] = useState<TierId | null>(null);
  const [lastEarnings, setLastEarnings] = useState<number | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ss_wallet") : null;
    if (stored) setWallet(parseFloat(stored));
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ss_wallet", wallet.toFixed(2));
  }, [wallet]);

  if (activeTier && mode) {
    const stake = mode === "training" ? 0 : getTier(activeTier).cost;
    const startWallet = mode === "training" ? wallet : wallet - stake;
    return (
      <Arena
        tier={activeTier}
        wallet={startWallet}
        mode={mode}
        onExit={(newWallet, earnings) => {
          setWallet(mode === "training" ? wallet : newWallet);
          setLastEarnings(earnings);
          setActiveTier(null);
        }}
      />
    );
  }

  if (mode) {
    return (
      <Lobby
        wallet={wallet}
        mode={mode}
        lastEarnings={lastEarnings}
        onStart={(tier) => setActiveTier(tier)}
        onBack={() => setMode(null)}
        onTopUp={() => setWallet(w => w + 20)}
      />
    );
  }

  return (
    <ModeSelect
      wallet={wallet}
      onPick={(m) => setMode(m)}
      onTopUp={() => setWallet(w => w + 20)}
    />
  );
}
