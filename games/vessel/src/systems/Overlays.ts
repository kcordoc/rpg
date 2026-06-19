import type { UpgradeCard } from '../game/content';

export interface EndSummary {
  won: boolean;
  ruptured: boolean;
  narrowingPercent: number;
  foamEmbedded: number;
  ldlCleared: number;
  headline: string;
  detail: string;
  stickyFact: string;
}

// All non-3D UI: curiosity toasts, the level-up choice, and the end card.
// Built in code so index.html stays tiny. Only the level-up and end card pause
// the game; toasts never block play.
export class Overlays {
  private readonly root = this.el('#overlay');
  private readonly toastEl = this.el('#toast');
  private readonly runHeader = this.el('#run-header');
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private toastTimer = 0;

  setRunHeader(text: string): void {
    this.runHeader.textContent = text;
  }

  /** transient curiosity / status line; auto-fades, never pauses the game */
  toast(text: string, kind: 'hook' | 'reveal' | 'info' = 'info', ms = 4200): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.textContent = text;
    this.toastEl.dataset.kind = kind;
    this.toastEl.classList.add('show');
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  showLevelUp(level: number, cards: UpgradeCard[], onPick: (card: UpgradeCard) => void): void {
    const pick = (card: UpgradeCard) => {
      this.clearKeys();
      this.root.innerHTML = '';
      this.root.classList.remove('active');
      onPick(card);
    };

    const panel = document.createElement('div');
    panel.className = 'card-panel';
    panel.innerHTML = `<h2>Level ${level}</h2><p class="sub">Pick one upgrade</p>`;

    const choices = document.createElement('div');
    choices.className = 'choices';
    cards.forEach((card, index) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.innerHTML = `
        <span class="hot">${index + 1}</span>
        <strong>${card.title}</strong>
        <em>${card.mechanism}</em>
        <span class="blurb">${card.blurb}</span>`;
      button.addEventListener('click', () => pick(card));
      choices.appendChild(button);
    });
    panel.appendChild(choices);

    this.root.innerHTML = '';
    this.root.appendChild(panel);
    this.root.classList.add('active');

    this.keyHandler = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < cards.length) pick(cards[idx]);
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  showEnd(summary: EndSummary, onRestart: () => void, onNewArtery: () => void): void {
    const panel = document.createElement('div');
    panel.className = `card-panel end ${summary.won ? 'win' : 'lose'}`;
    panel.innerHTML = `
      <h2>${summary.headline}</h2>
      <p class="detail">${summary.detail}</p>
      <div class="end-stats">
        <div><strong>${summary.narrowingPercent}%</strong><span>narrowed</span></div>
        <div><strong>${summary.foamEmbedded}</strong><span>foam cells</span></div>
        <div><strong>${summary.ldlCleared}</strong><span>LDL cleared</span></div>
      </div>
      <p class="sticky">${summary.stickyFact}</p>
      <div class="end-actions"></div>`;

    const actions = panel.querySelector<HTMLElement>('.end-actions');
    if (actions) {
      const again = document.createElement('button');
      again.className = 'primary';
      again.textContent = 'Next run';
      again.addEventListener('click', () => {
        this.root.innerHTML = '';
        this.root.classList.remove('active');
        onRestart();
      });
      const fresh = document.createElement('button');
      fresh.className = 'ghost';
      fresh.textContent = 'New artery';
      fresh.addEventListener('click', () => {
        this.root.innerHTML = '';
        this.root.classList.remove('active');
        onNewArtery();
      });
      actions.append(again, fresh);
    }

    this.root.innerHTML = '';
    this.root.appendChild(panel);
    this.root.classList.add('active');
  }

  private clearKeys(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
  }

  private el(selector: string): HTMLElement {
    const node = document.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Missing overlay element: ${selector}`);
    return node;
  }
}
