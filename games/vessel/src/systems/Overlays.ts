export interface ChoiceCard {
  id: string;
  title: string;
  mechanism: string;
  blurb: string;
  evolution?: boolean;
}

export interface EndSummary {
  won: boolean;
  ruptured: boolean;
  narrowingPercent: number;
  foamEmbedded: number;
  ldlCleared: number;
  score: number;
  headline: string;
  detail: string;
  stickyFact: string;
}

const ICONS: Record<string, string> = {
  shear: '≈', hdl: '◎', antioxidant: '✦', clearance: '⤵', statin: '⊘',
  cyclone: '🌀', macrophage: '⬣', surge: '✺',
};

// All non-3D UI: curiosity toasts, the level-up choice (with icons, rarity, and
// golden evolution cards), and an end card that draws the artery cross-section.
export class Overlays {
  private readonly root = this.el('#overlay');
  private readonly toastEl = this.el('#toast');
  private readonly runHeader = this.el('#run-header');
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private toastTimer = 0;

  setRunHeader(text: string): void {
    this.runHeader.textContent = text;
  }

  toast(text: string, kind: 'hook' | 'reveal' | 'info' = 'info', ms = 4200): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.textContent = text;
    this.toastEl.dataset.kind = kind;
    this.toastEl.classList.add('show');
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  showLevelUp(level: number, cards: ChoiceCard[], onPick: (card: ChoiceCard) => void): void {
    const pick = (card: ChoiceCard) => {
      this.clearKeys();
      this.close();
      onPick(card);
    };

    const panel = document.createElement('div');
    panel.className = 'card-panel pop';
    panel.innerHTML = `<h2>Level ${level}</h2><p class="sub">Choose an upgrade</p>`;

    const choices = document.createElement('div');
    choices.className = 'choices';
    cards.forEach((card, index) => {
      const button = document.createElement('button');
      button.className = `choice${card.evolution ? ' evolution' : ''}`;
      button.innerHTML = `
        <span class="hot">${index + 1}</span>
        <span class="badge">${ICONS[card.id] ?? '✦'}</span>
        ${card.evolution ? '<span class="rarity">EVOLUTION</span>' : ''}
        <strong>${card.title}</strong>
        <em>${card.mechanism}</em>
        <span class="blurb">${card.blurb}</span>`;
      button.addEventListener('click', () => pick(card));
      choices.appendChild(button);
    });
    panel.appendChild(choices);

    this.open(panel);
    this.keyHandler = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < cards.length) pick(cards[idx]);
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  showEnd(summary: EndSummary, onRestart: () => void, onNewArtery: () => void): void {
    const panel = document.createElement('div');
    panel.className = `card-panel end pop ${summary.won ? 'win' : 'lose'}`;
    panel.innerHTML = `
      <h2>${summary.headline}</h2>
      <p class="detail">${summary.detail}</p>
      <div class="end-body"></div>
      <p class="sticky">${summary.stickyFact}</p>
      <div class="end-actions"></div>`;

    const body = panel.querySelector<HTMLElement>('.end-body');
    if (body) {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      canvas.className = 'cross-section';
      this.drawCrossSection(canvas, summary);
      const stats = document.createElement('div');
      stats.className = 'end-stats';
      stats.innerHTML = `
        <div><strong>${summary.narrowingPercent}%</strong><span>narrowed</span></div>
        <div><strong>${summary.foamEmbedded}</strong><span>foam cells</span></div>
        <div><strong>${summary.score}</strong><span>score</span></div>`;
      body.append(canvas, stats);
    }

    const actions = panel.querySelector<HTMLElement>('.end-actions');
    if (actions) {
      const again = this.button('primary', 'Next run', () => { this.close(); onRestart(); });
      const fresh = this.button('ghost', 'New artery', () => { this.close(); onNewArtery(); });
      actions.append(again, fresh);
    }

    this.open(panel);
  }

  private drawCrossSection(canvas: HTMLCanvasElement, s: EndSummary): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = 75;
    const cy = 75;
    const outer = 64;
    // vessel wall
    ctx.fillStyle = '#7e1e24';
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.fill();
    // plaque ring grows inward with narrowing
    const lumen = outer * (1 - s.narrowingPercent / 130);
    ctx.fillStyle = '#caa23a';
    ctx.beginPath();
    ctx.arc(cx, cy, outer - 4, 0, Math.PI * 2);
    ctx.fill();
    // foam speckles in the plaque
    for (let i = 0; i < Math.min(s.foamEmbedded, 40); i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = lumen + 3 + Math.random() * (outer - lumen - 4);
      ctx.fillStyle = '#8a6f1f';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // open lumen (blood)
    ctx.fillStyle = s.ruptured ? '#3a0608' : '#b3161d';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(6, lumen), 0, Math.PI * 2);
    ctx.fill();
    if (s.ruptured) {
      ctx.strokeStyle = '#ff5a52';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(0.6) * outer, cy + Math.sin(0.6) * outer);
      ctx.stroke();
    }
  }

  private button(cls: string, label: string, cb: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', cb);
    return b;
  }

  private open(panel: HTMLElement): void {
    this.root.innerHTML = '';
    this.root.appendChild(panel);
    this.root.classList.add('active');
  }

  private close(): void {
    this.root.innerHTML = '';
    this.root.classList.remove('active');
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
