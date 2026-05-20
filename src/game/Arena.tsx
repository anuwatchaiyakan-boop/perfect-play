import { useEffect, useRef, useState } from "react";
import { ARENA, GameState, Input, createInitialState, step } from "./engine";
import { TierId } from "./tiers";

interface Props {
  tier: TierId;
  wallet: number;
  onExit: (newWallet: number, earnings: number) => void;
}

const BOUNTY_GLYPH: Record<string,string> = {
  damage: "⚔", rapid: "⚡", speed: "»", shield: "◈", heal: "+", cash: "$",
};

export default function Arena({ tier, wallet, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState(tier, wallet));
  const inputRef = useRef<Input>({ up:false,down:false,left:false,right:false,fire:false,aimX:0,aimY:0 });
  const [, setTick] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      const i = inputRef.current;
      if (k === "w" || k === "arrowup") i.up = down;
      else if (k === "s" || k === "arrowdown") i.down = down;
      else if (k === "a" || k === "arrowleft") i.left = down;
      else if (k === "d" || k === "arrowright") i.right = down;
      else if (k === " ") i.fire = down;
      else if (k === "p" && down) stateRef.current.paused = !stateRef.current.paused;
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const st = stateRef.current;
      const p = st.player;
      if (!p) return;
      const viewW = canvas.clientWidth, viewH = canvas.clientHeight;
      inputRef.current.aimX = p.x + (sx - viewW/2);
      inputRef.current.aimY = p.y + (sy - viewH/2);
    };
    const onDown = () => { inputRef.current.fire = true; };
    const onUp = () => { inputRef.current.fire = false; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);

    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = stateRef.current;
      step(st, inputRef.current, dt);
      render(ctx, st, canvas, v);
      setTick(t => (t+1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mouseup", onUp);
    };
  }, []);

  const st = stateRef.current;
  const p = st.player;

  return (
    <div className="fixed inset-0 bg-background">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair block" />
      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 p-4 flex flex-col">
        <div className="flex justify-between items-start gap-4">
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg px-4 py-3 text-card-foreground min-w-[220px]">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Wallet</div>
            <div className="text-2xl font-mono text-primary">${st.wallet.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">This life: <span className="text-accent">+${st.earnings.toFixed(2)}</span></div>
          </div>
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg px-4 py-2 text-card-foreground text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Toxic Zone</div>
            <div className="text-sm font-mono">{Math.floor(st.time)}s · r {Math.floor(st.zoneRadius)}</div>
          </div>
          <div className="bg-card/80 backdrop-blur border border-border rounded-lg px-3 py-2 text-card-foreground text-xs w-[280px]">
            <div className="text-muted-foreground uppercase tracking-widest text-[10px] mb-1">Kill Feed</div>
            {st.killFeed.length === 0 && <div className="text-muted-foreground italic">…</div>}
            {st.killFeed.map((k,i) => <div key={i} className="truncate">{k.text}</div>)}
          </div>
        </div>
        <div className="flex-1" />
        {/* Bottom bar */}
        {p && (
          <div className="flex items-end justify-between gap-4">
            <div className="bg-card/80 backdrop-blur border border-border rounded-lg px-4 py-3 text-card-foreground min-w-[260px]">
              <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground"><span>{p.tier.name}</span><span>{Math.max(0,Math.ceil(p.hp))}/{p.maxHp} HP</span></div>
              <div className="mt-1 h-3 bg-secondary rounded overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${Math.max(0,p.hp)/p.maxHp*100}%`, background: "var(--accent)" }} />
              </div>
              <div className="flex gap-2 mt-2 text-[10px] uppercase tracking-wider">
                {p.buffs.damage>0 && <span className="px-2 py-0.5 rounded bg-destructive/30 border border-destructive/50">DMG {p.buffs.damage.toFixed(1)}s</span>}
                {p.buffs.rapid>0 && <span className="px-2 py-0.5 rounded bg-primary/30 border border-primary/50">RAPID {p.buffs.rapid.toFixed(1)}s</span>}
                {p.buffs.speed>0 && <span className="px-2 py-0.5 rounded bg-accent/30 border border-accent/50">SPD {p.buffs.speed.toFixed(1)}s</span>}
                {p.shieldHits>0 && <span className="px-2 py-0.5 rounded bg-card border border-border">SHIELD x{p.shieldHits}</span>}
              </div>
            </div>
            <div className="bg-card/80 backdrop-blur border border-border rounded-lg px-3 py-2 text-card-foreground text-[11px] text-muted-foreground">
              WASD move · Mouse aim · Click/Space fire · P pause
            </div>
          </div>
        )}
      </div>
      {st.paused && !st.gameOver && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">PAUSED</div>
            <div className="text-muted-foreground">Press P to resume</div>
          </div>
        </div>
      )}
      {st.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-card-foreground shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-destructive">Eliminated</div>
            <h2 className="text-3xl font-bold mt-1 mb-4">Your tank is scrap.</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Stake Lost</div>
                <div className="text-xl font-mono">-${p?.tier.cost.toFixed(2)}</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Earned</div>
                <div className="text-xl font-mono text-accent">+${st.earnings.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Net this life: <span className={st.earnings - (p?.tier.cost ?? 0) >= 0 ? "text-accent" : "text-destructive"}>
                {(st.earnings - (p?.tier.cost ?? 0)).toFixed(2)}
              </span>  ·  Wallet: <span className="text-primary font-mono">${st.wallet.toFixed(2)}</span>
            </div>
            <button
              className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-3 hover:opacity-90 transition"
              onClick={() => onExit(st.wallet, st.earnings)}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function render(ctx: CanvasRenderingContext2D, st: GameState, canvas: HTMLCanvasElement, v: (n: string) => string) {
    const W = canvas.width, H = canvas.height;
    const viewW = canvas.clientWidth, viewH = canvas.clientHeight;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    ctx.clearRect(0,0,viewW,viewH);
    ctx.fillStyle = v("--background") || "#111";
    ctx.fillRect(0,0,viewW,viewH);

    const p = st.player;
    const camX = p ? p.x : ARENA.w/2;
    const camY = p ? p.y : ARENA.h/2;

    ctx.save();
    ctx.translate(viewW/2 - camX, viewH/2 - camY);

    // Grid
    ctx.strokeStyle = v("--border");
    ctx.lineWidth = 1;
    const gs = 80;
    const x0 = Math.floor((camX - viewW/2)/gs)*gs;
    const y0 = Math.floor((camY - viewH/2)/gs)*gs;
    ctx.beginPath();
    for (let x = x0; x < camX + viewW/2 + gs; x += gs) { ctx.moveTo(x, camY - viewH/2); ctx.lineTo(x, camY + viewH/2); }
    for (let y = y0; y < camY + viewH/2 + gs; y += gs) { ctx.moveTo(camX - viewW/2, y); ctx.lineTo(camX + viewW/2, y); }
    ctx.stroke();

    // Arena border
    ctx.strokeStyle = v("--primary");
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, ARENA.w, ARENA.h);

    // Toxic zone (everything outside circle is tinted)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,ARENA.w,ARENA.h);
    ctx.arc(st.zoneCx, st.zoneCy, st.zoneRadius, 0, Math.PI*2, true);
    ctx.fillStyle = "rgba(120,255,80,0.10)";
    ctx.fill("evenodd");
    ctx.restore();
    ctx.strokeStyle = v("--toxic");
    ctx.lineWidth = 3;
    ctx.setLineDash([14,10]);
    ctx.beginPath();
    ctx.arc(st.zoneCx, st.zoneCy, st.zoneRadius, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Walls
    for (const w of st.walls) {
      ctx.fillStyle = w.destructible ? v("--muted") : v("--secondary");
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = v("--border");
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // Bounties
    for (const b of st.bounties) {
      if (!b.active) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      const pulse = 1 + Math.sin(performance.now()/200) * 0.08;
      ctx.beginPath();
      ctx.arc(0,0,14*pulse,0,Math.PI*2);
      ctx.fillStyle = v("--accent");
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0,0,9,0,Math.PI*2);
      ctx.fillStyle = v("--card");
      ctx.fill();
      ctx.strokeStyle = v("--accent");
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = v("--accent");
      ctx.font = "bold 14px ui-monospace,monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(BOUNTY_GLYPH[b.kind] || "?", 0, 1);
      ctx.restore();
    }

    // Bullets
    for (const b of st.bullets) {
      ctx.fillStyle = v("--primary");
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI*2);
      ctx.fill();
    }

    // Tanks
    for (const t of st.tanks) {
      if (!t.alive) continue;
      const color = colorFor(t.tier.color, v);
      ctx.save();
      ctx.translate(t.x, t.y);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.arc(2, 4, t.tier.radius, 0, Math.PI*2); ctx.fill();
      // Body
      ctx.rotate(t.angle);
      ctx.fillStyle = color;
      const r = t.tier.radius;
      roundRect(ctx, -r, -r*0.85, r*2, r*1.7, 4);
      ctx.fill();
      ctx.strokeStyle = v("--background");
      ctx.lineWidth = 2;
      ctx.stroke();
      // tracks
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(-r, -r*1.05, r*2, 4);
      ctx.fillRect(-r, r*1.05 - 4, r*2, 4);
      ctx.restore();

      // Turret
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.turret);
      ctx.fillStyle = v("--card");
      ctx.beginPath(); ctx.arc(0,0, t.tier.radius*0.55, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = v("--background"); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(0, -3, t.tier.radius + 12, 6);
      ctx.restore();

      // Shield ring
      if (t.shieldHits > 0) {
        ctx.strokeStyle = "rgba(180,220,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.tier.radius + 6, 0, Math.PI*2); ctx.stroke();
      }

      // HP bar + label
      const bw = Math.max(40, t.tier.radius * 2.4);
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(t.x - bw/2, t.y - t.tier.radius - 14, bw, 5);
      ctx.fillStyle = v("--accent");
      ctx.fillRect(t.x - bw/2, t.y - t.tier.radius - 14, bw * Math.max(0,t.hp)/t.maxHp, 5);
      ctx.fillStyle = v("--foreground");
      ctx.font = "11px ui-sans-serif,system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${t.name} · $${t.tier.cost.toFixed(2)}`, t.x, t.y - t.tier.radius - 18);
    }

    // Float texts
    for (const f of st.floats) {
      ctx.globalAlpha = Math.min(1, f.t);
      ctx.fillStyle = colorFor(f.color, v);
      ctx.font = "bold 16px ui-monospace,monospace";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Minimap
    const mmS = 160;
    const mmX = viewW - mmS - 16;
    const mmY = viewH - mmS - 16;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(mmX, mmY, mmS, mmS);
    ctx.strokeStyle = v("--border"); ctx.strokeRect(mmX, mmY, mmS, mmS);
    const sc = mmS / ARENA.w;
    // zone
    ctx.strokeStyle = v("--toxic"); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mmX + st.zoneCx*sc, mmY + st.zoneCy*sc, st.zoneRadius*sc, 0, Math.PI*2); ctx.stroke();
    for (const t of st.tanks) {
      if (!t.alive) continue;
      ctx.fillStyle = t.isPlayer ? v("--primary") : v("--destructive");
      ctx.beginPath(); ctx.arc(mmX + t.x*sc, mmY + t.y*sc, t.isPlayer ? 3 : 2, 0, Math.PI*2); ctx.fill();
    }

    // Pause hint when paused (drawn in DOM too)
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function colorFor(token: string, v: (n: string) => string): string {
  const m = /var\((--[\w-]+)\)/.exec(token);
  if (m) return v(m[1]) || "#fff";
  return token;
}