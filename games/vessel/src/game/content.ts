// Centralised game content.
//
// Two jobs live here on purpose:
//   1. Tuning numbers for the run.
//   2. The (deliberately tiny) educational copy.
//
// Design rule from the brief: learning is the *byproduct* of replay, never an
// info dump. So every string here is one short line, shown briefly, skippable.
// The biology rides inside the mechanics — these lines only name what the player
// is already feeling.

export const RUN = {
  waveCount: 3,
  waveSeconds: 42,
  arena: { halfWidth: 13, halfDepth: 6.4 },
  wallZ: 6.0,
} as const;

export type UpgradeId = 'shear' | 'hdl' | 'antioxidant' | 'statin' | 'clearance';

export interface UpgradeCard {
  id: UpgradeId;
  title: string;
  /** the real mechanism, named in 1-3 words */
  mechanism: string;
  /** what it does in-game, <= ~9 words */
  blurb: string;
  /** earliest player level this card may appear */
  minLevel: number;
}

// Each upgrade is a true mechanism the player learns by *using* it, not reading.
export const UPGRADES: UpgradeCard[] = [
  {
    id: 'shear',
    title: 'Shear Wave',
    mechanism: 'Exercise',
    blurb: 'Pulse sweeps LDL off the wall + firms the cap.',
    minLevel: 1,
  },
  {
    id: 'hdl',
    title: 'HDL Escort',
    mechanism: 'Good cholesterol',
    blurb: 'An orbiter that hauls LDL away.',
    minLevel: 1,
  },
  {
    id: 'antioxidant',
    title: 'Antioxidant',
    mechanism: 'Stops oxidation',
    blurb: 'LDL takes longer to embed — more time to clear.',
    minLevel: 1,
  },
  {
    id: 'clearance',
    title: 'LDL Receptors',
    mechanism: 'Liver clearance',
    blurb: 'Clear LDL faster.',
    minLevel: 1,
  },
  {
    id: 'statin',
    title: 'Statin',
    mechanism: 'Lowers the source',
    blurb: 'Fewer LDL enter the bloodstream.',
    minLevel: 2,
  },
];

// The curiosity spine. Each wave opens a gap (a question the player thinks they
// know), the run itself closes it, and the clear line names the payoff.
export interface WaveBeat {
  hook: string;
  reveal: string;
}

export const WAVE_BEATS: WaveBeat[] = [
  {
    hook: 'Plaque always starts where arteries branch. Why there?',
    reveal: 'Turbulent flow makes the wall sticky — LDL slips in.',
  },
  {
    hook: 'More LDL in the blood. Watch what it does to your wall.',
    reveal: 'Lower the LDL, lower the buildup. You felt the difference.',
  },
  {
    hook: 'This artery is barely narrowed. So why is it dangerous?',
    reveal: "It's the thin, inflamed cap that ruptures — not the size.",
  },
];

// The single sticky idea the whole prototype ladders to.
export const STICKY_FACT =
  'Most heart attacks strike arteries less than half blocked. It is not how blocked you are — it is how much you have built up, and how stable it is.';
