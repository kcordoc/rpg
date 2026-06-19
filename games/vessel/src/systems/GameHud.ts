import type { RunStats } from '../game/types';

// Top-of-screen bars. Glanceable, near-wordless — the player reads state from
// colour and fill, not sentences.
export class GameHud {
  private readonly wallFill = this.el('#bar-wall-fill');
  private readonly wallText = this.el('#bar-wall-text');
  private readonly plaqueFill = this.el('#bar-plaque-fill');
  private readonly plaqueText = this.el('#bar-plaque-text');
  private readonly xpFill = this.el('#bar-xp-fill');
  private readonly levelText = this.el('#bar-level-text');
  private readonly waveText = this.el('#bar-wave-text');
  private readonly timerText = this.el('#bar-timer-text');

  update(stats: RunStats, narrowingPercent: number, waveLabel: string, waveRemaining: number): void {
    this.wallFill.style.width = `${stats.wallIntegrity}%`;
    this.wallFill.style.background = stats.wallIntegrity < 30 ? '#ff4d57' : stats.wallIntegrity < 60 ? '#ffb24d' : '#5fe6a8';
    this.wallText.textContent = `${Math.round(stats.wallIntegrity)}`;

    this.plaqueFill.style.width = `${narrowingPercent}%`;
    this.plaqueText.textContent = `${narrowingPercent}%`;

    this.xpFill.style.width = `${Math.min(100, (stats.xp / stats.xpToNext) * 100)}%`;
    this.levelText.textContent = `Lv ${stats.level}`;

    this.waveText.textContent = waveLabel;
    this.timerText.textContent = `${Math.max(0, Math.ceil(waveRemaining))}s`;
  }

  private el(selector: string): HTMLElement {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Missing HUD element: ${selector}`);
    return node;
  }
}
