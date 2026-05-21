import { supabase } from "@/integrations/supabase/client";
import type { GameState, GameMode } from "./engine";
import { applyRemoteDamage, resolveRemoteKill, upsertRemoteTank, ingestRemoteBullet } from "./engine";

function makeId() {
  const k = "shell:playerId";
  let v = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
  if (!v) {
    v = crypto.randomUUID();
    try { localStorage.setItem(k, v); } catch {}
  }
  return v;
}
function makeName() {
  const k = "shell:playerName";
  let v = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
  if (!v) {
    v = "Cmdr-" + Math.floor(Math.random()*9000+1000);
    try { localStorage.setItem(k, v); } catch {}
  }
  return v;
}

export function getPlayerIdentity() {
  return { id: makeId(), name: makeName() };
}
export function setPlayerName(name: string) {
  try { localStorage.setItem("shell:playerName", name); } catch {}
}

export class MultiplayerSession {
  private channel: ReturnType<typeof supabase.channel>;
  private state: GameState;
  private acc = 0;
  private ready = false;

  constructor(mode: GameMode, state: GameState) {
    this.state = state;
    this.channel = supabase.channel(`arena-${mode}`, {
      config: { broadcast: { self: false, ack: false } },
    });

    this.channel.on("broadcast", { event: "state" }, ({ payload }) => {
      try { upsertRemoteTank(this.state, payload as any); } catch {}
    });
    this.channel.on("broadcast", { event: "fire" }, ({ payload }) => {
      try { ingestRemoteBullet(this.state, payload as any); } catch {}
    });
    this.channel.on("broadcast", { event: "hit" }, ({ payload }) => {
      const h = payload as { targetId:string; attackerId:string; attackerName:string; dmg:number };
      if (h.targetId === this.state.netId) {
        applyRemoteDamage(this.state, h.attackerId, h.attackerName, h.dmg);
      }
    });
    this.channel.on("broadcast", { event: "death" }, ({ payload }) => {
      try { resolveRemoteKill(this.state, payload as any); } catch {}
    });
    this.channel.on("broadcast", { event: "leave" }, ({ payload }) => {
      const id = (payload as any)?.id;
      this.state.tanks = this.state.tanks.filter(t => t.id !== id);
    });

    this.channel.subscribe((status) => {
      if (status === "SUBSCRIBED") this.ready = true;
    });
  }

  tick(dt: number) {
    if (!this.ready) return;
    const out = this.state.outgoing;
    if (out) {
      for (const f of out.fires) {
        this.channel.send({ type: "broadcast", event: "fire", payload: f });
      }
      out.fires.length = 0;
      for (const h of out.hits) {
        this.channel.send({ type: "broadcast", event: "hit", payload: h });
      }
      out.hits.length = 0;
      if (out.death) {
        this.channel.send({ type: "broadcast", event: "death", payload: out.death });
        out.death = null;
      }
    }

    this.acc += dt;
    if (this.acc < 0.07) return;
    this.acc = 0;

    const p = this.state.player;
    if (!p) return;
    this.channel.send({
      type: "broadcast",
      event: "state",
      payload: {
        id: p.id,
        name: p.name,
        tierId: p.tier.id,
        x: p.x, y: p.y, angle: p.angle, turret: p.turret,
        hp: p.hp, alive: p.alive,
      },
    });
  }

  destroy() {
    try {
      this.channel.send({
        type: "broadcast",
        event: "leave",
        payload: { id: this.state.netId },
      });
    } catch {}
    supabase.removeChannel(this.channel);
  }
}