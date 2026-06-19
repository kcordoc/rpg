import type { UpgradeId } from './content';

// Mutable state for a single run. Upgrades mutate the dials; systems read them.
export interface RunStats {
  level: number;
  xp: number;
  xpToNext: number;

  // run "health": the artery wall. LDL embedding damages it. 0 = rupture.
  wallIntegrity: number; // 0..100
  capStability: number; // 0..100 (how rupture-resistant the cap is)
  inflammation: number; // 0..100

  ldlCleared: number;
  foamEmbedded: number; // count this run

  // upgrade levels
  upgrades: Record<UpgradeId, number>;
  // unlocked synergy evolutions ("break the game" builds)
  evolutions: { cyclone: boolean; macrophage: boolean; surge: boolean };

  // derived dials (recomputed from upgrades + persistent plaque)
  spawnRate: number; // LDL spawned per second
  fireInterval: number; // seconds between guardian shots
  oxidationSeconds: number; // time an LDL needs at the wall to embed
}

export function createRunStats(plaqueBurden: number): RunStats {
  const stats: RunStats = {
    level: 1,
    xp: 0,
    xpToNext: 7,
    wallIntegrity: 100,
    // a more-plaqued artery starts with a thinner, more fragile cap
    capStability: Math.max(35, 100 - plaqueBurden * 0.7),
    inflammation: Math.min(40, plaqueBurden * 0.4),
    ldlCleared: 0,
    foamEmbedded: 0,
    upgrades: { shear: 0, hdl: 0, antioxidant: 0, statin: 0, clearance: 0 },
    evolutions: { cyclone: false, macrophage: false, surge: false },
    spawnRate: 0,
    fireInterval: 0,
    oxidationSeconds: 0,
    // make a worse artery a slightly harder run (more LDL pressure)
  };
  recomputeDials(stats, plaqueBurden);
  return stats;
}

// Re-derive the difficulty dials from the upgrade levels + lifetime plaque.
export function recomputeDials(stats: RunStats, plaqueBurden: number): void {
  const base = 2.4 + plaqueBurden * 0.025;
  stats.spawnRate = Math.max(0.8, base - stats.upgrades.statin * 0.6);
  stats.fireInterval = Math.max(0.12, 0.5 - stats.upgrades.clearance * 0.08);
  stats.oxidationSeconds = 2.6 + stats.upgrades.antioxidant * 0.9;
}
