import { useEffect, useRef, useState } from "react";
import { ARENA, GameState, Input, createInitialState, step, GameMode } from "./engine";
import { TierId } from "./tiers";

interface Props {
  tier: TierId;
  wallet: number;
  mode: GameMode;
  onExit: (newWallet: number, earnings: number) => void;
}

const BOUNTY_GLYPH: Record<string,string> = {
  damage: "⚔", rapid: "⚡", speed: "»", shield: "◈", heal: "+", cash: "$",
};

export default function Arena({ tier, wallet, mode, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState(tier, wallet, mode));
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
      else if (k === " ") { i.fire = down; e.preventDefault(); }
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
    const cache: Record<string,string> = {};
    const v = (n: string) => (cache[n] ??= css.getPropertyValue(n).trim());

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
      <div className="pointer-events-none absolute inset-0 p-4 flex flex-col">
        <div className="flex justify-between items-start gap-4">
          <div className="bg-card/85 backdrop-blur border border-border rounded-lg px-4 py-3 text-card-foreground min-w-[220px] shadow-lg">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{mode === "training" ? "Training Wallet" : "Wallet"}</div>
            <div className="text-2xl font-mono text-primary">${st.wallet.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">This life: <span className="text-accent">+${st.earnings.toFixed(2)}</span></div>
          </div>
          <div className="bg-card/85 backdrop-blur border border-border rounded-lg px-4 py-2 text-card-foreground text-center shadow-lg">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{modeLabel(mode)}</div>
            <div className="text-sm font-mono">{fmtTime(st.time)} · Zone {Math.floor(st.zoneRadius)}</div>
          </div>
          <div className="bg-card/85 backdrop-blur border border-border rounded-lg px-3 py-2 text-card-foreground text-xs w-[280px] shadow-lg">
            <div className="text-muted-foreground uppercase tracking-widest text-[10px] mb-1">Kill Feed</div>
            {st.killFeed.length === 0 && <div className="text-muted-foreground italic">awaiting first blood…</div>}
            {st.killFeed.map((k,i) => <div key={i} className="truncate">{k.text}</div>)}
          </div>
        </div>
        <div className="flex-1" />
        {p && (
          <div className="flex items-end justify-between gap-4">
            <div className="bg-card/85 backdrop-blur border border-border rounded-lg px-4 py-3 text-card-foreground min-w-[280px] shadow-lg">
              <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{background:p.tier.color}} />{p.tier.name}</span>
                <span>{Math.max(0,Math.ceil(p.hp))}/{p.maxHp} HP</span>
              </div>
              <div className="mt-1 h-3 bg-secondary rounded overflow-hidden border border-border">
                <div className="h-full transition-all" style={{ width: `${Math.max(0,p.hp)/p.maxHp*100}%`, background: "linear-gradient(90deg,var(--accent),var(--primary))" }} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] uppercase tracking-wider">
                {p.buffs.damage>0 && <span className="px-2 py-0.5 rounded bg-destructive/30 border border-destructive/50">⚔ {p.buffs.damage.toFixed(1)}s</span>}
                {p.buffs.rapid>0 && <span className="px-2 py-0.5 rounded bg-primary/30 border border-primary/50">⚡ {p.buffs.rapid.toFixed(1)}s</span>}
                {p.buffs.speed>0 && <span className="px-2 py-0.5 rounded bg-accent/30 border border-accent/50">» {p.buffs.speed.toFixed(1)}s</span>}
                {p.shieldHits>0 && <span className="px-2 py-0.5 rounded bg-card border border-border">◈ x{p.shieldHits}</span>}
              </div>
            </div>
            <div className="bg-card/85 backdrop-blur border border-border rounded-lg px-3 py-2 text-card-foreground text-[11px] text-muted-foreground shadow-lg">
              WASD · Mouse aim · Click/Space fire · P pause
            </div>
          </div>
        )}
      </div>
      {st.paused && !st.gameOver && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2 tracking-widest">PAUSED</div>
            <div className="text-muted-foreground">Press P to resume</div>
          </div>
        </div>
      )}
      {st.gameOver && (
        <div className="absolute inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-card-foreground shadow-2xl">
            <div className="text-xs uppercase tracking-widest text-destructive">Tank Destroyed</div>
            <h2 className="text-3xl font-bold mt-1 mb-4">Wreckage logged.</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Stake</div>
                <div className="text-xl font-mono text-destructive">-${p?.tier.cost.toFixed(2)}</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Earned</div>
                <div className="text-xl font-mono text-accent">+${st.earnings.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Net: <span className={st.earnings - (p?.tier.cost ?? 0) >= 0 ? "text-accent" : "text-destructive"}>
                {(st.earnings - (p?.tier.cost ?? 0)).toFixed(2)}
              </span>  ·  Wallet: <span className="text-primary font-mono">${st.wallet.toFixed(2)}</span>
            </div>
            <button
              className="w-full bg-primary text-primary-foreground font-semibold rounded-lg py-3 hover:opacity-90 transition"
              onClick={() => onExit(st.wallet, st.earnings)}
            >
              Back to Hangar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function render(ctx: CanvasRenderingContext2D, st: GameState, canvas: HTMLCanvasElement, v: (n: string) => string) {
    const viewW = canvas.clientWidth, viewH = canvas.clientHeight;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
    ctx.clearRect(0,0,viewW,viewH);

    // Background gradient
    const bg = ctx.createRadialGradient(viewW/2, viewH/2, 50, viewW/2, viewH/2, Math.max(viewW,viewH));
    bg.addColorStop(0, v("--card"));
    bg.addColorStop(1, v("--background"));
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,viewW,viewH);

    const p = st.player;
    const camX = p ? p.x : ARENA.w/2;
    const camY = p ? p.y : ARENA.h/2;
    const shakeX = (Math.random()-0.5) * st.shake;
    const shakeY = (Math.random()-0.5) * st.shake;

    ctx.save();
    ctx.translate(viewW/2 - camX + shakeX, viewH/2 - camY + shakeY);

    // Tile floor
    const tile = 100;
    const x0 = Math.floor((camX - viewW/2)/tile)*tile;
    const y0 = Math.floor((camY - viewH/2)/tile)*tile;
    for (let x = x0; x < camX + viewW/2 + tile; x += tile) {
      for (let y = y0; y < camY + viewH/2 + tile; y += tile) {
        const checker = (((x/tile)+(y/tile)) & 1) === 0;
        ctx.fillStyle = checker ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.15)";
        ctx.fillRect(x, y, tile, tile);
      }
    }
    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gs = 50;
    const gx0 = Math.floor((camX - viewW/2)/gs)*gs;
    const gy0 = Math.floor((camY - viewH/2)/gs)*gs;
    for (let x = gx0; x < camX + viewW/2 + gs; x += gs) { ctx.moveTo(x, camY - viewH/2); ctx.lineTo(x, camY + viewH/2); }
    for (let y = gy0; y < camY + viewH/2 + gs; y += gs) { ctx.moveTo(camX - viewW/2, y); ctx.lineTo(camX + viewW/2, y); }
    ctx.stroke();

    // Arena border (double line)
    ctx.strokeStyle = v("--primary");
    ctx.lineWidth = 5;
    ctx.strokeRect(0, 0, ARENA.w, ARENA.h);
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, ARENA.w, ARENA.h);

    // Toxic zone overlay
    ctx.save();
    ctx.beginPath();
    ctx.rect(-100,-100,ARENA.w+200,ARENA.h+200);
    ctx.arc(st.zoneCx, st.zoneCy, st.zoneRadius, 0, Math.PI*2, true);
    const tg = ctx.createRadialGradient(st.zoneCx, st.zoneCy, st.zoneRadius, st.zoneCx, st.zoneCy, st.zoneRadius * 1.5);
    tg.addColorStop(0, "rgba(120,255,80,0.05)");
    tg.addColorStop(1, "rgba(120,255,80,0.35)");
    ctx.fillStyle = tg;
    ctx.fill("evenodd");
    ctx.restore();
    // Zone ring (pulsing)
    const pulse = 0.7 + Math.sin(performance.now()/250)*0.3;
    ctx.strokeStyle = v("--toxic");
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 4;
    ctx.setLineDash([18,12]);
    ctx.beginPath();
    ctx.arc(st.zoneCx, st.zoneCy, st.zoneRadius, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Walls (with depth)
    for (const w of st.walls) {
      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(w.x+4, w.y+4, w.w, w.h);
      // body
      const baseColor = w.destructible ? v("--muted") : v("--secondary");
      const g = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      g.addColorStop(0, lighten(baseColor, 0.15));
      g.addColorStop(1, darken(baseColor, 0.2));
      ctx.fillStyle = g;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      // highlight edge
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x+w.w, w.y); ctx.stroke();
      // outline
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
      // destructible HP indicator
      if (w.destructible && w.hp !== undefined && w.hp < 80) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(w.x, w.y - 5, w.w, 3);
        ctx.fillStyle = v("--accent");
        ctx.fillRect(w.x, w.y - 5, w.w * (w.hp/80), 3);
      }
    }

    // Bounties (animated)
    for (const b of st.bounties) {
      if (!b.active) {
        // ghost ring while cooling
        ctx.strokeStyle = "rgba(120,140,140,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, Math.PI*2); ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.translate(b.x, b.y);
      const t = performance.now()/250;
      const pul = 1 + Math.sin(t) * 0.12;
      // Glow
      const rg = ctx.createRadialGradient(0,0,2,0,0,28*pul);
      rg.addColorStop(0, "rgba(150,255,180,0.6)");
      rg.addColorStop(1, "rgba(150,255,180,0)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(0,0,28*pul,0,Math.PI*2); ctx.fill();
      // Disc
      ctx.rotate(t * 0.4);
      ctx.beginPath();
      for (let i=0;i<6;i++){
        const a = (i/6)*Math.PI*2;
        ctx.lineTo(Math.cos(a)*12, Math.sin(a)*12);
      }
      ctx.closePath();
      ctx.fillStyle = v("--card");
      ctx.fill();
      ctx.strokeStyle = v("--accent");
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.rotate(-t * 0.4);
      ctx.fillStyle = v("--accent");
      ctx.font = "bold 15px ui-monospace,monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(BOUNTY_GLYPH[b.kind] || "?", 0, 1);
      ctx.restore();
    }

    // Bullets (with glow + trail)
    for (const b of st.bullets) {
      // trail
      for (let i=0;i<b.trail.length;i++){
        const tp = b.trail[i];
        const a = (i / b.trail.length) * 0.5;
        ctx.globalAlpha = a;
        ctx.fillStyle = colorFor(b.color, v);
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 2 + i*0.2, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // glow
      const bg2 = ctx.createRadialGradient(b.x,b.y,1,b.x,b.y,12);
      bg2.addColorStop(0, "rgba(255,240,180,0.9)");
      bg2.addColorStop(1, "rgba(255,240,180,0)");
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.arc(b.x,b.y,12,0,Math.PI*2); ctx.fill();
      // core
      ctx.fillStyle = "#fff8d8";
      ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = colorFor(b.color, v);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Tanks (detailed)
    for (const t of st.tanks) {
      if (!t.alive) continue;
      drawTank(ctx, t, v);
    }

    // Particles
    for (const part of st.particles) {
      const lf = part.life / part.maxLife;
      ctx.globalAlpha = Math.min(1, lf);
      if (part.kind === "ring") {
        const r = part.size * (1 + (1 - lf) * 2.4);
        ctx.strokeStyle = part.color;
        ctx.lineWidth = 3 * lf + 1;
        ctx.beginPath(); ctx.arc(part.x, part.y, r, 0, Math.PI*2); ctx.stroke();
      } else if (part.kind === "fire" || part.kind === "smoke") {
        const r = part.size * (part.kind === "smoke" ? (2 - lf) : (0.5 + lf*0.8));
        const g = ctx.createRadialGradient(part.x, part.y, 0, part.x, part.y, r);
        g.addColorStop(0, part.color);
        g.addColorStop(1, part.color.replace(/[\d.]+\)$/, "0)"));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(part.x, part.y, r, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = part.color;
        ctx.beginPath(); ctx.arc(part.x, part.y, part.size * Math.max(0.3, lf), 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Float texts
    for (const f of st.floats) {
      ctx.globalAlpha = Math.min(1, f.t);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.font = "bold 17px ui-monospace,monospace";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x+1, f.y+1);
      ctx.fillStyle = colorFor(f.color, v);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Vignette
    const vg = ctx.createRadialGradient(viewW/2, viewH/2, Math.min(viewW,viewH)*0.4, viewW/2, viewH/2, Math.max(viewW,viewH)*0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,viewW,viewH);

    // Minimap
    const mmS = 170;
    const mmX = viewW - mmS - 16;
    const mmY = viewH - mmS - 16;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(mmX, mmY, mmS, mmS);
    ctx.strokeStyle = v("--border"); ctx.lineWidth = 1; ctx.strokeRect(mmX, mmY, mmS, mmS);
    const sc = mmS / ARENA.w;
    // walls
    for (const w of st.walls) {
      ctx.fillStyle = w.destructible ? "rgba(180,180,180,0.35)" : "rgba(220,220,220,0.6)";
      ctx.fillRect(mmX + w.x*sc, mmY + w.y*sc, Math.max(1, w.w*sc), Math.max(1, w.h*sc));
    }
    // zone
    ctx.strokeStyle = v("--toxic"); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mmX + st.zoneCx*sc, mmY + st.zoneCy*sc, st.zoneRadius*sc, 0, Math.PI*2); ctx.stroke();
    for (const t of st.tanks) {
      if (!t.alive) continue;
      ctx.fillStyle = t.isPlayer ? v("--primary") : v("--destructive");
      ctx.beginPath(); ctx.arc(mmX + t.x*sc, mmY + t.y*sc, t.isPlayer ? 4 : 2.5, 0, Math.PI*2); ctx.fill();
    }
  }
}

function drawTank(ctx: CanvasRenderingContext2D, t: any, v: (n: string)=>string) {
  const color = colorFor(t.tier.color, v);
  const r = t.tier.radius;
  ctx.save();
  ctx.translate(t.x, t.y);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(3, 5, r*1.1, r*0.95, 0, 0, Math.PI*2); ctx.fill();

  // Body rotation
  ctx.rotate(t.angle);

  // Treads (animated)
  ctx.fillStyle = "#1a1a1a";
  roundRect(ctx, -r-1, -r*1.15, r*2+2, r*0.35, 3); ctx.fill();
  roundRect(ctx, -r-1,  r*0.8,  r*2+2, r*0.35, 3); ctx.fill();
  // Tread segments
  ctx.fillStyle = "#3a3a3a";
  const seg = 6;
  const sw = (r*2+2) / seg;
  const off = (t.trackOffset % sw);
  for (let i=-1;i<seg+1;i++){
    const x = -r-1 + i*sw + off;
    ctx.fillRect(x, -r*1.13, sw*0.55, r*0.31);
    ctx.fillRect(x, r*0.82,  sw*0.55, r*0.31);
  }

  // Hull base
  const hg = ctx.createLinearGradient(0, -r, 0, r);
  hg.addColorStop(0, lighten(color, 0.25));
  hg.addColorStop(0.5, color);
  hg.addColorStop(1, darken(color, 0.35));
  ctx.fillStyle = hg;
  roundRect(ctx, -r*1.05, -r*0.85, r*2.1, r*1.7, 5);
  ctx.fill();
  // Hull outline
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rivets
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  const rv = [[-r*0.85,-r*0.6],[r*0.85,-r*0.6],[-r*0.85,r*0.6],[r*0.85,r*0.6]];
  for (const [rx,ry] of rv){ ctx.beginPath(); ctx.arc(rx,ry,1.6,0,Math.PI*2); ctx.fill(); }

  // Hull plate stripe (camo accent)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-r*0.35, -r*0.85, r*0.7, r*1.7);

  ctx.restore();

  // Turret
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.turret);
  // Barrel
  const barrelLen = r + 14 + (t.tier.bullets > 1 ? 4 : 0);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, -4.5, barrelLen + 2, 9);
  const bg = ctx.createLinearGradient(0,-3,0,3);
  bg.addColorStop(0, lighten(color, 0.2));
  bg.addColorStop(1, darken(color, 0.4));
  ctx.fillStyle = bg;
  ctx.fillRect(2, -3, barrelLen - 2, 6);
  // Muzzle brake
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(barrelLen - 6, -5, 6, 10);
  // Multi-barrel hint
  if (t.tier.bullets >= 2) {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(2, -8, barrelLen - 6, 3);
    ctx.fillRect(2, 5, barrelLen - 6, 3);
  }

  // Turret dome
  const tr = r * 0.62;
  const tg = ctx.createRadialGradient(-tr*0.3, -tr*0.3, 1, 0, 0, tr*1.2);
  tg.addColorStop(0, lighten(color, 0.4));
  tg.addColorStop(1, darken(color, 0.3));
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.arc(0,0, tr, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 2; ctx.stroke();
  // Hatch
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.arc(-tr*0.25,0, tr*0.3, 0, Math.PI*2); ctx.fill();

  // Muzzle flash
  if (t.muzzleFlash > 0) {
    const f = t.muzzleFlash / 0.08;
    ctx.save();
    ctx.translate(barrelLen + 4, 0);
    const flashG = ctx.createRadialGradient(0,0,0,0,0,20*f);
    flashG.addColorStop(0, "rgba(255,250,200,1)");
    flashG.addColorStop(0.4, "rgba(255,180,80,0.9)");
    flashG.addColorStop(1, "rgba(255,100,40,0)");
    ctx.fillStyle = flashG;
    ctx.beginPath(); ctx.arc(0,0,20*f,0,Math.PI*2); ctx.fill();
    // Star
    ctx.fillStyle = "rgba(255,250,220,0.95)";
    ctx.beginPath();
    for (let i=0;i<8;i++){
      const a = (i/8)*Math.PI*2;
      const rr = i%2===0 ? 16*f : 7*f;
      ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Shield ring
  if (t.shieldHits > 0) {
    ctx.save();
    ctx.translate(t.x, t.y);
    const sp = 0.5 + Math.sin(performance.now()/120)*0.3;
    ctx.strokeStyle = `rgba(160,210,255,${sp})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0,0, r + 8, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = `rgba(220,240,255,${sp*0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0,0, r + 12, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // HP bar + label
  const bw = Math.max(46, r * 2.6);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(t.x - bw/2 - 1, t.y - r - 16, bw + 2, 7);
  const hpRatio = Math.max(0, t.hp)/t.maxHp;
  const hpColor = hpRatio > 0.5 ? "#7ee29a" : hpRatio > 0.25 ? "#f0c862" : "#e26666";
  ctx.fillStyle = hpColor;
  ctx.fillRect(t.x - bw/2, t.y - r - 15, bw * hpRatio, 5);
  ctx.fillStyle = t.isPlayer ? v("--primary") : v("--foreground");
  ctx.font = `${t.isPlayer ? "bold " : ""}11px ui-sans-serif,system-ui`;
  ctx.textAlign = "center";
  ctx.fillText(`${t.name} · $${t.tier.cost.toFixed(2)}`, t.x, t.y - r - 20);
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

// Color utilities (approximate; works for hex/rgb/oklch by overlay)
function lighten(c: string, k: number) {
  return `color-mix(in oklab, ${c} ${(1-k)*100}%, white)`;
}
function darken(c: string, k: number) {
  return `color-mix(in oklab, ${c} ${(1-k)*100}%, black)`;
}

function fmtTime(s: number) {
  const m = Math.floor(s/60); const ss = Math.floor(s%60);
  return `${m}:${ss.toString().padStart(2,"0")}`;
}
function modeLabel(m: GameMode) {
  return ({ training:"Training Range", bronze:"Bronze Arena", silver:"Silver Arena", elite:"Elite Arena" })[m];
}