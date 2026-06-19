// Persistent artery state — the cumulative-exposure hook.
//
// Plaque you fail to clear is *not* reset between runs. It carries forward in
// localStorage, so the player watches one artery get worse (or hold steady)
// across a "lifetime" of runs. That persistence is the whole point: it makes
// cumulative LDL exposure something you live, not something you read.

const KEY = 'vessel.artery.v1';

export interface ArteryState {
  /** lifetime plaque burden, 0-100 (% narrowing of the lumen) */
  plaque: number;
  /** how many runs this artery has lived through */
  runs: number;
}

const FRESH: ArteryState = { plaque: 0, runs: 0 };

export function loadArtery(): ArteryState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...FRESH };
    const parsed = JSON.parse(raw) as Partial<ArteryState>;
    return {
      plaque: clamp(parsed.plaque ?? 0, 0, 100),
      runs: Math.max(0, Math.floor(parsed.runs ?? 0)),
    };
  } catch {
    return { ...FRESH };
  }
}

export function saveArtery(state: ArteryState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the run still plays, it just
    // won't accumulate. That is an acceptable degrade for a prototype.
  }
}

export function resetArtery(): ArteryState {
  const fresh = { ...FRESH };
  saveArtery(fresh);
  return fresh;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
