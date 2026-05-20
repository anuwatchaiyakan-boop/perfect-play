import { Tier, TIERS, getTier, TierId } from "./tiers";

export const ARENA = { w: 2000, h: 2000 };

export interface Bullet {
  x: number; y: number; vx: number; vy: number;
  ownerId: string; damage: number; life: number;
  color: string; trail: { x: number; y: number; t: number }[];
}

export interface Tank {
  id: string;
  isPlayer: boolean;
  name: string;
  tier: Tier;
  x: number; y: number;
  vx: number; vy: number;
  angle: number;          // body
  turret: number;         // turret aim
  trackOffset: number;    // for tread animation
  muzzleFlash: number;    // remaining flash time
  hp: number; maxHp: number;
  cooldown: number;
  alive: boolean;
  damageDealtBy: Map<string, number>; // attacker id -> dmg
  shieldHits: number;
  buffs: { damage: number; rapid: number; speed: number; cloak: number };
  // AI
  aiTimer: number; aiTargetX: number; aiTargetY: number;
  aiFireCooldown: number;
}

export interface Wall { x: number; y: number; w: number; h: number; destructible: boolean; hp?: number; }

export type BountyKind = "damage" | "rapid" | "speed" | "shield" | "heal" | "cash";
export interface Bounty {
  x: number; y: number; kind: BountyKind; respawn: number; active: boolean;
}

export interface KillFeedEntry { text: string; t: number; }
export interface FloatText { x: number; y: number; text: string; color: string; t: number; }

export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
  size: number; color: string; kind: "spark" | "smoke" | "fire" | "debris" | "ring";
}

export interface GameState {
  tanks: Tank[];
  bullets: Bullet[];
  walls: Wall[];
  bounties: Bounty[];
  particles: Particle[];
  player: Tank | null;
  time: number;
  zoneRadius: number;
  zoneTargetRadius: number;
  zoneCx: number; zoneCy: number;
  killFeed: KillFeedEntry[];
  floats: FloatText[];
  earnings: number; // virtual $ this life
  wallet: number;   // running wallet
  gameOver: boolean;
  lastKillSummary: null | { victim: string; bounty: number; rows: { name: string; pct: number; earned: number; isPlayer: boolean }[] };
  paused: boolean;
  shake: number;
  mode: GameMode;
}

export type GameMode = "training" | "bronze" | "silver" | "elite";

export const MODE_TIER_POOLS: Record<GameMode, TierId[]> = {
  training: ["rookie","scout","soldier","bronze"],
  bronze:   ["rookie","scout","soldier"],
  silver:   ["bronze","silver","gold"],
  elite:    ["gold","platinum","diamond"],
};

const BOT_NAMES = ["Vex","Rook","Nova","Hex","Brick","Ghost","Tank","Saber","Bolt","Crash","Fang","Jinx","Wolf","Rust","Zero","Kilo"];

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function dist(a: {x:number;y:number}, b: {x:number;y:number}) { return Math.hypot(a.x-b.x, a.y-b.y); }

export function createInitialState(playerTierId: TierId, wallet: number, mode: GameMode = "training"): GameState {
  const walls: Wall[] = [];
  // Outer border handled via collision with arena bounds
  // Indestructible walls
  const ind = [
    [400, 400, 280, 40], [400, 400, 40, 280],
    [1320, 400, 280, 40], [1560, 400, 40, 280],
    [400, 1560, 280, 40], [400, 1320, 40, 280],
    [1320, 1560, 280, 40], [1560, 1320, 40, 280],
    [900, 700, 200, 30], [900, 1270, 200, 30],
    [700, 900, 30, 200], [1270, 900, 30, 200],
  ];
  ind.forEach(([x,y,w,h]) => walls.push({ x,y,w,h, destructible: false }));
  // Destructible barriers
  const des = [
    [950, 950, 100, 100], [600, 1000, 80, 80], [1320, 1000, 80, 80],
    [1000, 600, 80, 80], [1000, 1320, 80, 80],
    [500, 500, 60, 60], [1440, 500, 60, 60], [500, 1440, 60, 60], [1440, 1440, 60, 60],
  ];
  des.forEach(([x,y,w,h]) => walls.push({ x,y,w,h, destructible: true, hp: 80 }));

  // Bounty nodes
  const bountyKinds: BountyKind[] = ["damage","rapid","speed","shield","heal","cash"];
  const bountyPositions = [
    {x:1000,y:1000}, {x:600,y:600}, {x:1400,y:600}, {x:600,y:1400}, {x:1400,y:1400},
    {x:1000,y:500}, {x:1000,y:1500}, {x:500,y:1000}, {x:1500,y:1000},
  ];
  const bounties: Bounty[] = bountyPositions.map((p,i) => ({
    x: p.x, y: p.y, kind: bountyKinds[i % bountyKinds.length], respawn: 0, active: true,
  }));

  const playerTier = getTier(playerTierId);
  const player = makeTank("player", true, "You", playerTier, ARENA.w/2 - 200, ARENA.h/2);

  // Bots: mix of tiers, weighted toward cheap
  const tanks: Tank[] = [player];
  const tierPool: TierId[] = MODE_TIER_POOLS[mode];
  const botCount = 9;
  for (let i=0;i<botCount;i++){
    const t = getTier(tierPool[Math.floor(Math.random()*tierPool.length)]);
    const angle = (i / botCount) * Math.PI * 2;
    const r = 700 + rand(-50, 50);
    const x = ARENA.w/2 + Math.cos(angle)*r;
    const y = ARENA.h/2 + Math.sin(angle)*r;
    tanks.push(makeTank("b"+i, false, BOT_NAMES[i % BOT_NAMES.length], t, x, y));
  }

  return {
    tanks, bullets: [], walls, bounties, particles: [],
    player,
    time: 0,
    zoneCx: ARENA.w/2, zoneCy: ARENA.h/2,
    zoneRadius: Math.hypot(ARENA.w,ARENA.h)/2,
    zoneTargetRadius: Math.hypot(ARENA.w,ARENA.h)/2,
    killFeed: [], floats: [], earnings: 0, wallet,
    gameOver: false, lastKillSummary: null, paused: false,
    shake: 0, mode,
  };
}

function makeTank(id: string, isPlayer: boolean, name: string, tier: Tier, x: number, y: number): Tank {
  return {
    id, isPlayer, name, tier, x, y, vx:0, vy:0, angle: 0, turret: 0,
    trackOffset: 0, muzzleFlash: 0,
    hp: tier.hp, maxHp: tier.hp, cooldown: 0, alive: true,
    damageDealtBy: new Map(), shieldHits: 0,
    buffs: { damage: 0, rapid: 0, speed: 0, cloak: 0 },
    aiTimer: 0, aiTargetX: x, aiTargetY: y, aiFireCooldown: 0,
  };
}

// Toxic zone stages from GDD (timings)
function zoneRadiusAt(t: number): number {
  const max = Math.hypot(ARENA.w,ARENA.h)/2;
  // 0-90 safe (full), 90-150 -> 70%, 180-240 -> 50%, 270-330 -> 30%, 360-420 -> 15%
  const stages = [
    { start: 0,   end: 90,  from: 1,    to: 1   },
    { start: 90,  end: 150, from: 1,    to: 0.7 },
    { start: 150, end: 180, from: 0.7,  to: 0.7 },
    { start: 180, end: 240, from: 0.7,  to: 0.5 },
    { start: 240, end: 270, from: 0.5,  to: 0.5 },
    { start: 270, end: 330, from: 0.5,  to: 0.3 },
    { start: 330, end: 360, from: 0.3,  to: 0.3 },
    { start: 360, end: 420, from: 0.3,  to: 0.15 },
  ];
  for (const s of stages) {
    if (t >= s.start && t <= s.end) {
      const k = (t - s.start) / Math.max(1, s.end - s.start);
      return max * (s.from + (s.to - s.from) * k);
    }
  }
  return max * 0.15;
}
function zoneDamageAt(t: number): number {
  if (t < 90) return 0;
  if (t < 180) return 5;
  if (t < 270) return 10;
  if (t < 360) return 18;
  return 25;
}

export interface Input { up: boolean; down: boolean; left: boolean; right: boolean; fire: boolean; aimX: number; aimY: number; }

function rectCollide(t: Tank, w: Wall): boolean {
  const cx = Math.max(w.x, Math.min(t.x, w.x + w.w));
  const cy = Math.max(w.y, Math.min(t.y, w.y + w.h));
  return Math.hypot(t.x - cx, t.y - cy) < t.tier.radius;
}

function tryMove(tank: Tank, nx: number, ny: number, walls: Wall[]) {
  const orig = { x: tank.x, y: tank.y };
  tank.x = nx;
  for (const w of walls) if (rectCollide(tank, w)) { tank.x = orig.x; break; }
  tank.y = ny;
  for (const w of walls) if (rectCollide(tank, w)) { tank.y = orig.y; break; }
  // arena bounds
  tank.x = Math.max(tank.tier.radius, Math.min(ARENA.w - tank.tier.radius, tank.x));
  tank.y = Math.max(tank.tier.radius, Math.min(ARENA.h - tank.tier.radius, tank.y));
}

function fire(state: GameState, tank: Tank) {
  const tier = tank.tier;
  const rapid = tank.buffs.rapid > 0 ? 1.7 : 1;
  const cd = 1 / (tier.fireRate * rapid);
  if (tank.cooldown > 0) return;
  tank.cooldown = cd;
  tank.muzzleFlash = 0.08;
  if (tank.isPlayer) state.shake = Math.min(8, state.shake + 2);
  const damageMul = tank.buffs.damage > 0 ? 1.7 : 1;
  const bullets = tier.bullets;
  const spread = bullets === 1 ? 0 : 0.18;
  for (let i=0; i<bullets; i++) {
    const off = bullets === 1 ? 0 : (i - (bullets-1)/2) * spread;
    const a = tank.turret + off;
    state.bullets.push({
      x: tank.x + Math.cos(a) * (tier.radius + 4),
      y: tank.y + Math.sin(a) * (tier.radius + 4),
      vx: Math.cos(a) * tier.bulletSpeed,
      vy: Math.sin(a) * tier.bulletSpeed,
      ownerId: tank.id,
      damage: tier.damage * damageMul,
      life: 1.4,
      color: tank.tier.color,
      trail: [],
    });
  }
  // Muzzle smoke
  for (let i=0;i<5;i++){
    const a = tank.turret + rand(-0.35,0.35);
    const sp = rand(40, 140);
    state.particles.push({
      x: tank.x + Math.cos(tank.turret)*(tier.radius+8),
      y: tank.y + Math.sin(tank.turret)*(tier.radius+8),
      vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      life: rand(0.25,0.5), maxLife: 0.5,
      size: rand(4,9), color: "rgba(220,200,160,0.7)", kind: "smoke",
    });
  }
}

function applyDamage(state: GameState, victim: Tank, attackerId: string, dmg: number) {
  if (!victim.alive) return;
  if (victim.shieldHits > 0) { victim.shieldHits--; return; }
  victim.hp -= dmg;
  victim.damageDealtBy.set(attackerId, (victim.damageDealtBy.get(attackerId) || 0) + dmg);
  if (victim.hp <= 0) {
    victim.alive = false;
    resolveKill(state, victim, attackerId);
  }
}

function resolveKill(state: GameState, victim: Tank, killerId: string) {
  const bounty = victim.tier.cost * 0.95;
  spawnExplosion(state, victim.x, victim.y, victim.tier.radius);
  state.shake = Math.min(20, state.shake + 8 + victim.tier.radius * 0.2);
  const entries = Array.from(victim.damageDealtBy.entries());
  const totalDmg = entries.reduce((s, [,d]) => s+d, 0) || 1;
  // Top damager
  const top = entries.reduce((a,b) => b[1] > a[1] ? b : a, entries[0]);
  const rows: { name: string; pct: number; earned: number; isPlayer: boolean }[] = [];
  for (const [aid, dmg] of entries) {
    const attacker = state.tanks.find(t => t.id === aid);
    if (!attacker) continue;
    const share = dmg / totalDmg;
    let earned = bounty * 0.70 * share;
    if (aid === top[0] && aid === killerId) earned += bounty * 0.30;
    else {
      if (aid === top[0]) earned += bounty * 0.25;
      if (aid === killerId) earned += bounty * 0.05;
    }
    rows.push({ name: attacker.name, pct: share*100, earned, isPlayer: attacker.isPlayer });
    if (attacker.isPlayer) {
      state.earnings += earned;
      state.wallet += earned;
      state.floats.push({ x: victim.x, y: victim.y - 30, text: "+$"+earned.toFixed(2), color: "var(--tier-gold)", t: 1.4 });
    }
  }
  rows.sort((a,b) => b.earned - a.earned);
  const killer = state.tanks.find(t => t.id === killerId);
  state.killFeed.unshift({ text: `${killer?.name ?? "?"} eliminated ${victim.name} ($${victim.tier.cost.toFixed(2)})`, t: 5 });
  if (state.killFeed.length > 6) state.killFeed.pop();
  state.lastKillSummary = { victim: victim.name, bounty, rows };

  if (victim.isPlayer) {
    state.gameOver = true;
  }
}

function applyBountyToTank(state: GameState, tank: Tank, kind: BountyKind) {
  switch (kind) {
    case "damage": tank.buffs.damage = 6; break;
    case "rapid": tank.buffs.rapid = 6; break;
    case "speed": tank.buffs.speed = 5; break;
    case "shield": tank.shieldHits = 3; break;
    case "heal": tank.hp = Math.min(tank.maxHp, tank.hp + tank.maxHp * 0.5); break;
    case "cash": {
      if (tank.isPlayer) {
        const amt = rand(0.10, 1.00);
        state.earnings += amt; state.wallet += amt;
        state.floats.push({ x: tank.x, y: tank.y - 30, text: "+$"+amt.toFixed(2), color: "var(--tier-gold)", t: 1.4 });
      }
      break;
    }
  }
  if (tank.isPlayer) {
    state.floats.push({ x: tank.x, y: tank.y - 20, text: kind.toUpperCase(), color: "var(--accent)", t: 1 });
  }
}

function aiUpdate(state: GameState, bot: Tank, dt: number) {
  bot.aiTimer -= dt;
  bot.aiFireCooldown -= dt;
  // find nearest enemy
  let target: Tank | null = null; let best = Infinity;
  for (const t of state.tanks) {
    if (t === bot || !t.alive) continue;
    const d = dist(bot, t);
    if (d < best) { best = d; target = t; }
  }
  // Bounty target if close
  if (bot.aiTimer <= 0 || dist(bot, {x:bot.aiTargetX,y:bot.aiTargetY}) < 40) {
    let bestB: Bounty | null = null; let bd = 600;
    for (const b of state.bounties) if (b.active) {
      const d = dist(bot, b); if (d < bd) { bd = d; bestB = b; }
    }
    if (bestB && Math.random() < 0.5) { bot.aiTargetX = bestB.x; bot.aiTargetY = bestB.y; }
    else if (target) {
      const a = Math.atan2(bot.y - target.y, bot.x - target.x);
      const desired = Math.min(280, bot.tier.radius * 8);
      bot.aiTargetX = target.x + Math.cos(a) * desired + rand(-100,100);
      bot.aiTargetY = target.y + Math.sin(a) * desired + rand(-100,100);
    } else {
      bot.aiTargetX = ARENA.w/2 + rand(-300,300);
      bot.aiTargetY = ARENA.h/2 + rand(-300,300);
    }
    bot.aiTimer = rand(1.2, 2.5);
  }
  // outside zone -> head to center
  const dz = Math.hypot(bot.x - state.zoneCx, bot.y - state.zoneCy);
  if (dz > state.zoneRadius - 50) { bot.aiTargetX = state.zoneCx; bot.aiTargetY = state.zoneCy; }

  const dx = bot.aiTargetX - bot.x, dy = bot.aiTargetY - bot.y;
  const d = Math.hypot(dx,dy) || 1;
  const speedMul = bot.buffs.speed > 0 ? 1.4 : 1;
  const speed = bot.tier.speed * speedMul;
  const nx = bot.x + (dx/d) * speed * dt;
  const ny = bot.y + (dy/d) * speed * dt;
  bot.angle = Math.atan2(dy, dx);
  tryMove(bot, nx, ny, state.walls);

  // Aim & fire
  if (target) {
    bot.turret = Math.atan2(target.y - bot.y, target.x - bot.x);
    const distToTarget = dist(bot, target);
    if (distToTarget < 520 && bot.aiFireCooldown <= 0) {
      fire(state, bot);
      bot.aiFireCooldown = rand(0.05, 0.2);
    }
  }
}

export function step(state: GameState, input: Input, dt: number) {
  if (state.gameOver || state.paused) return;
  state.time += dt;

  // Zone shrink
  state.zoneRadius = zoneRadiusAt(state.time);

  // Player update
  const p = state.player;
  if (p && p.alive) {
    let mx = 0, my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    const len = Math.hypot(mx,my);
    if (len > 0) { mx/=len; my/=len; p.angle = Math.atan2(my,mx); }
    const speedMul = p.buffs.speed > 0 ? 1.4 : 1;
    const sp = p.tier.speed * speedMul;
    tryMove(p, p.x + mx*sp*dt, p.y + my*sp*dt, state.walls);
    p.turret = Math.atan2(input.aimY - p.y, input.aimX - p.x);
    if (input.fire) fire(state, p);
  }

  // Update cooldowns + buffs + zone damage + bot AI
  for (const t of state.tanks) {
    if (!t.alive) continue;
    t.cooldown = Math.max(0, t.cooldown - dt);
    (Object.keys(t.buffs) as (keyof typeof t.buffs)[]).forEach(k => t.buffs[k] = Math.max(0, t.buffs[k] - dt));
    if (!t.isPlayer) aiUpdate(state, t, dt);
    // zone damage
    const dz = Math.hypot(t.x - state.zoneCx, t.y - state.zoneCy);
    if (dz > state.zoneRadius) {
      const dps = zoneDamageAt(state.time);
      t.hp -= dps * dt;
      if (t.hp <= 0 && t.alive) {
        t.alive = false;
        state.killFeed.unshift({ text: `${t.name} consumed by toxic zone`, t: 5 });
        if (t.isPlayer) state.gameOver = true;
      }
    }
  }

  // Bullets
  for (const b of state.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
  }
  // Bullet collisions
  for (const b of state.bullets) {
    if (b.life <= 0) continue;
    // walls
    for (const w of state.walls) {
      if (b.x >= w.x && b.x <= w.x+w.w && b.y >= w.y && b.y <= w.y+w.h) {
        if (w.destructible && w.hp !== undefined) {
          w.hp -= b.damage;
        }
        b.life = 0;
        break;
      }
    }
    if (b.life <= 0) continue;
    // tanks
    for (const t of state.tanks) {
      if (!t.alive || t.id === b.ownerId) continue;
      if (Math.hypot(t.x - b.x, t.y - b.y) < t.tier.radius) {
        applyDamage(state, t, b.ownerId, b.damage);
        b.life = 0;
        break;
      }
    }
  }
  state.bullets = state.bullets.filter(b => b.life > 0 && b.x >= 0 && b.y >= 0 && b.x <= ARENA.w && b.y <= ARENA.h);
  state.walls = state.walls.filter(w => !w.destructible || (w.hp ?? 1) > 0);

  // Bounty pickups
  for (const b of state.bounties) {
    if (!b.active) {
      b.respawn -= dt;
      if (b.respawn <= 0) b.active = true;
      continue;
    }
    for (const t of state.tanks) {
      if (!t.alive) continue;
      if (Math.hypot(t.x - b.x, t.y - b.y) < t.tier.radius + 14) {
        applyBountyToTank(state, t, b.kind);
        b.active = false; b.respawn = 12;
        break;
      }
    }
  }

  // Respawn bots so arena stays lively
  const aliveBots = state.tanks.filter(t => !t.isPlayer && t.alive).length;
  if (aliveBots < 7 && Math.random() < 0.02) {
    const pool: TierId[] = ["rookie","scout","soldier","bronze","silver","gold","platinum","diamond"];
    const tier = getTier(pool[Math.floor(Math.random()*pool.length)]);
    const a = Math.random()*Math.PI*2;
    const r = Math.min(state.zoneRadius - 100, 800);
    const nx = state.zoneCx + Math.cos(a)*r;
    const ny = state.zoneCy + Math.sin(a)*r;
    state.tanks.push(makeTank("b"+Date.now()+Math.random(), false, BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)], tier, nx, ny));
  }

  // Kill feed / floats decay
  state.killFeed.forEach(k => k.t -= dt);
  state.killFeed = state.killFeed.filter(k => k.t > 0);
  state.floats.forEach(f => { f.t -= dt; f.y -= 20*dt; });
  state.floats = state.floats.filter(f => f.t > 0);

  // Remove long-dead bots (keep player corpse for game-over)
  state.tanks = state.tanks.filter(t => t.isPlayer || t.alive);
}

// Reference exports for unused warnings
export { TIERS };