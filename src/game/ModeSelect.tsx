import { GameMode, MODE_TIER_POOLS } from "./engine";
import { getTier } from "./tiers";

interface Props {
  wallet: number;
  onPick: (mode: GameMode) => void;
  onTopUp: () => void;
}

const MODES: { id: GameMode; name: string; tag: string; desc: string; ring: string; }[] = [
  { id: "training", name: "Training Range", tag: "FREE · vs Bots",       desc: "Practice with no stakes. Wallet untouched. Bots up to Bronze.",            ring: "var(--tier-soldier)" },
  { id: "bronze",   name: "Bronze Arena",   tag: "$0.10 – $0.50 stakes", desc: "Entry tier brawl. Fast cheap tanks, frequent kills, low risk.",            ring: "var(--tier-bronze)"  },
  { id: "silver",   name: "Silver Arena",   tag: "$1 – $3 stakes",       desc: "Balanced mid-tier combat. Bigger bounties, real coordination matters.",   ring: "var(--tier-silver)"  },
  { id: "elite",    name: "Elite Arena",    tag: "$5 – $10 stakes",      desc: "Heavy armor only. Slow giants, massive payouts, vulture-proof splits.",   ring: "var(--tier-diamond)" },
];

export default function ModeSelect({ wallet, onPick, onTopUp }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-accent">Shell Stakes</div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mt-2">
              Choose your <span className="text-primary">arena</span>.
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl">
              Training is free. Stake arenas use virtual currency in this prototype — real multiplayer is the production target.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 min-w-[240px] shadow-lg">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet</div>
            <div className="text-4xl font-mono text-primary">${wallet.toFixed(2)}</div>
            <button onClick={onTopUp} className="mt-3 w-full text-xs uppercase tracking-widest border border-border rounded-md py-2 hover:bg-secondary transition">
              Top up +$20
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {MODES.map(m => {
            const tiers = MODE_TIER_POOLS[m.id].map(id => getTier(id));
            const minCost = Math.min(...tiers.map(t => t.cost));
            const canEnter = m.id === "training" || wallet >= minCost;
            return (
              <button
                key={m.id}
                disabled={!canEnter}
                onClick={() => onPick(m.id)}
                className={`group relative text-left p-6 rounded-2xl border-2 transition overflow-hidden ${
                  canEnter ? "border-border bg-card hover:border-primary hover:shadow-[0_0_40px_-10px_var(--primary)]"
                           : "border-border/40 bg-card/40 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-20 blur-2xl" style={{ background: m.ring }} />
                <div className="flex items-center justify-between relative">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.tag}</span>
                  {m.id === "training" && <span className="text-[10px] uppercase tracking-widest text-accent px-2 py-0.5 rounded border border-accent/40">SAFE</span>}
                </div>
                <h2 className="text-3xl font-bold mt-2 relative">{m.name}</h2>
                <p className="text-sm text-muted-foreground mt-2 relative">{m.desc}</p>
                <div className="flex gap-2 mt-5 relative">
                  {tiers.map(t => (
                    <div key={t.id} className="flex-1 bg-secondary/50 border border-border rounded-lg p-2 text-center">
                      <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: t.color }} />
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.name}</div>
                      <div className="text-sm font-mono">${t.cost.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 text-xs uppercase tracking-widest text-primary relative group-hover:translate-x-1 transition">
                  {canEnter ? "Enter →" : `Need $${minCost.toFixed(2)}`}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4 text-sm">
          <Info title="Damage Share" body="70% split by damage · 25% top damager · 5% kill shot. No more vulture kills." />
          <Info title="Toxic Zone"   body="Map shrinks every 90s. Campers die. Endgame is intense close combat." />
          <Info title="Speed vs Power" body="Cheap tanks are fastest. Diamonds are slowest but deadly. Flank and win." />
        </div>
      </div>
    </div>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-card/60 border border-border rounded-xl p-4">
      <div className="text-accent text-xs uppercase tracking-widest">{title}</div>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}