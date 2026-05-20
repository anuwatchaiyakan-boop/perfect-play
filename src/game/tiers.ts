export type TierId =
  | "rookie" | "scout" | "soldier" | "bronze"
  | "silver" | "gold" | "platinum" | "diamond";

export interface Tier {
  id: TierId;
  name: string;
  cost: number;
  hp: number;
  speed: number;       // px/sec
  damage: number;      // per bullet
  fireRate: number;    // shots/sec
  bullets: number;     // bullets per shot (spread)
  radius: number;      // tank size
  color: string;       // css var name
  bulletSpeed: number;
}

export const TIERS: Tier[] = [
  { id: "rookie",   name: "Rookie",   cost: 0.10, hp: 60,  speed: 220, damage: 8,  fireRate: 2.4, bullets: 1, radius: 14, color: "var(--tier-rookie)",   bulletSpeed: 520 },
  { id: "scout",    name: "Scout",    cost: 0.25, hp: 80,  speed: 205, damage: 10, fireRate: 2.4, bullets: 1, radius: 15, color: "var(--tier-scout)",    bulletSpeed: 520 },
  { id: "soldier",  name: "Soldier",  cost: 0.50, hp: 100, speed: 190, damage: 13, fireRate: 2.2, bullets: 1, radius: 16, color: "var(--tier-soldier)",  bulletSpeed: 500 },
  { id: "bronze",   name: "Bronze",   cost: 1.00, hp: 130, speed: 175, damage: 16, fireRate: 2.0, bullets: 1, radius: 17, color: "var(--tier-bronze)",   bulletSpeed: 500 },
  { id: "silver",   name: "Silver",   cost: 2.00, hp: 170, speed: 160, damage: 20, fireRate: 1.9, bullets: 1, radius: 19, color: "var(--tier-silver)",   bulletSpeed: 480 },
  { id: "gold",     name: "Gold",     cost: 3.00, hp: 220, speed: 150, damage: 26, fireRate: 1.8, bullets: 1, radius: 21, color: "var(--tier-gold)",     bulletSpeed: 470 },
  { id: "platinum", name: "Platinum", cost: 5.00, hp: 290, speed: 130, damage: 22, fireRate: 1.6, bullets: 2, radius: 24, color: "var(--tier-platinum)", bulletSpeed: 460 },
  { id: "diamond",  name: "Diamond",  cost: 10.00,hp: 420, speed: 110, damage: 24, fireRate: 1.5, bullets: 3, radius: 28, color: "var(--tier-diamond)",  bulletSpeed: 450 },
];

export const getTier = (id: TierId) => TIERS.find(t => t.id === id)!;