import type { RunStats } from '../game/types';

// Glanceable, themed HUD: icon meters for wall/plaque/level, wave + score,
// a combo pop, and a boss bar. State is read from colour and fill, not prose.
export class GameHud {
  private readonly wallFill = this.el('#wall-fill');
  private readonly wallText = this.el('#wall-text');
  private readonly plaqueFill = this.el('#plaque-fill');
  private readonly plaqueText = this.el('#plaque-text');
  private readonly xpFill = this.el('#xp-fill');
  private readonly levelText = this.el('#level-text');
  private readonly waveText = this.el('#wave-text');
  private readonly timerText = this.el('#timer-text');
  private readonly scoreText = this.el('#score-text');
  private readonly comboEl = this.el('#combo');
  private readonly bossBar = this.el('#boss-bar');
  private readonly bossFill = this.el('#boss-fill');
  private readonly fpsEl = this.el('#fps');

  private shownScore = 0;

  update(stats: RunStats, narrowingPercent: number, waveLabel: string, waveRemaining: number, score: number): void {
    this.wallFill.style.width = `${stats.wallIntegrity}%`;
    this.wallFill.style.background = stats.wallIntegrity < 30 ? '#ff4d57' : stats.wallIntegrity < 60 ? '#ffb24d' : '#5fe6a8';
    this.wallText.textContent = `${Math.round(stats.wallIntegrity)}`;

    this.plaqueFill.style.width = `${narrowingPercent}%`;
    this.plaqueText.textContent = `${narrowingPercent}%`;

    this.xpFill.style.width = `${Math.min(100, (stats.xp / stats.xpToNext) * 100)}%`;
    this.levelText.textContent = `Lv ${stats.level}`;

    this.waveText.textContent = waveLabel;
    this.timerText.textContent = `${Math.max(0, Math.ceil(waveRemaining))}s`;

    // score eases up so it feels like it's counting
    if (this.shownScore < score) this.shownScore = Math.min(score, this.shownScore + Math.ceil((score - this.shownScore) * 0.3));
    else this.shownScore = score;
    this.scoreText.textContent = String(this.shownScore);
  }

  setCombo(combo: number): void {
    if (combo >= 3) {
      this.comboEl.hidden = false;
      this.comboEl.textContent = `x${combo}`;
      const scale = Math.min(1.5, 1 + combo * 0.02);
      this.comboEl.style.transform = `translateX(-50%) scale(${scale})`;
      this.comboEl.style.color = combo >= 20 ? '#ff8af0' : combo >= 10 ? '#ffd86b' : '#9ffff0';
    } else {
      this.comboEl.hidden = true;
    }
  }

  setBoss(active: boolean, frac: number): void {
    this.bossBar.hidden = !active;
    if (active) this.bossFill.style.width = `${Math.max(0, frac * 100)}%`;
  }

  setFps(fps: number, calls: number): void {
    this.fpsEl.textContent = `${fps} fps · ${calls} calls`;
  }

  private el(selector: string): HTMLElement {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Missing HUD element: ${selector}`);
    return node;
  }
}
