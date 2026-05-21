import { useState, useMemo, useEffect } from "react";
import { TIERS, TierId } from "./tiers";
import { GameMode } from "./engine";
import { getPlayerIdentity, setPlayerName } from "./multiplayer";

interface Props {
  wallet: number;
  mode: GameMode;
  lastEarnings: number | null;
  onStart: (tier: TierId) => void;
  onBack: () => void;
  onTopUp: () => void;
}

const MODE_NAME: Record<GameMode,string> = {
  training: "Training Range",
  bronze: "Bronze Arena",
  silver: "Silver Arena",
  elite: "Elite Arena",
};

export default function Lobby({ wallet, mode, lastEarnings, onStart, onBack, onTopUp }: Props) {
  // Any tank can be selected in any arena.
  const tiers = useMemo(() => TIERS, []);
  const [selected, setSelected] = useState<TierId>(tiers[0].id);
  const [name, setName] = useState<string>(() => getPlayerIdentity().name);
  useEffect(() => { setPlayerName(name); }, [name]);
  const tier = TIERS.find(t => t.id === selected)!;
  const canAfford = wallet >= tier.cost;
  const isTraining = mode === "training";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-6">← Change arena</button>
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-accent">{MODE_NAME[mode]}</div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mt-2">
              Pick your <span className="text-primary">tank</span>.
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              {isTraining
                ? "Free practice. No stake deducted, no earnings cashed out — sharpen aim and learn the toxic zone."
                : "Pay your tank cost as a one-time stake. Max loss equals your stake. Earnings split by damage dealt."}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 min-w-[240px]">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet</div>
            <div className="text-4xl font-mono text-primary">${wallet.toFixed(2)}</div>
            {lastEarnings !== null && (
              <div className="text-xs text-muted-foreground mt-1">Last run: <span className="text-accent">+${lastEarnings.toFixed(2)}</span></div>
            )}
            <button onClick={onTopUp} className="mt-3 w-full text-xs uppercase tracking-widest border border-border rounded-md py-2 hover:bg-secondary transition">
              Top up +$20
            </button>
            {mode !== "training" && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Callsign</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0,20))}
                  className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm font-mono"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiers.map(t => {
            const active = t.id === selected;
            const broke = !isTraining && wallet < t.cost;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                disabled={broke}
                className={`text-left p-4 rounded-xl border transition relative ${
                  active ? "border-primary bg-card shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                         : "border-border bg-card/60 hover:bg-card"
                } ${broke ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{t.name}</span>
                </div>
                <div className="text-2xl font-mono">${t.cost.toFixed(2)}</div>
                <div className="mt-3 grid grid-cols-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>HP</span><span className="text-right text-foreground">{t.hp}</span>
                  <span>Speed</span><span className="text-right text-foreground">{t.speed}</span>
                  <span>Damage</span><span className="text-right text-foreground">{t.damage}</span>
                  <span>Bullets</span><span className="text-right text-foreground">{t.bullets}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between bg-card border border-border rounded-xl p-5 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Entering with</div>
            <div className="text-2xl font-semibold">{tier.name} <span className="text-muted-foreground font-mono text-base">· {isTraining ? "no stake" : `$${tier.cost.toFixed(2)} stake`}</span></div>
            <div className="text-sm text-muted-foreground mt-1">
              {isTraining ? "No money risked or earned." : <>Max loss: <span className="font-mono">${tier.cost.toFixed(2)}</span>. Damage-share payouts apply.</>} Toxic zone closes from 1:30.
            </div>
          </div>
          <button
            disabled={!canAfford}
            onClick={() => onStart(selected)}
            className={`px-8 py-4 rounded-lg font-bold uppercase tracking-widest transition ${
              canAfford ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            {canAfford ? "Deploy Tank →" : "Insufficient Funds"}
          </button>
        </div>
      </div>
    </div>
  );
}