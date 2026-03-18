/**
 * ThemeManager — singleton that controls the active theme.
 *
 * Responsibilities:
 * 1. Injects CSS custom properties onto document.documentElement
 * 2. Persists selection to localStorage
 * 3. Exposes Phaser-side config (world tint, particles) for the Overworld scene
 * 4. Emits 'theme-changed' on the EventBus so Vue + Phaser can react
 */

import { getTheme, DEFAULT_THEME, THEMES, THEME_LIST } from './themeConfig.js';
import { EventBus } from '../game/EventBus.js';
import { THEME_KEY } from '../constants.js';

class ThemeManager {
  constructor() {
    this._currentId = DEFAULT_THEME;
    this._current = getTheme(DEFAULT_THEME);
  }

  /** Load saved theme from localStorage (call once at startup) */
  init() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && THEMES[saved]) {
      this._currentId = saved;
    } else {
      this._currentId = DEFAULT_THEME;
    }
    this._current = getTheme(this._currentId);
    this._applyCSS();
  }

  /** Get current theme config object */
  get current() {
    return this._current;
  }

  /** Get current theme ID string */
  get currentId() {
    return this._currentId;
  }

  /** Switch to a theme by ID */
  setTheme(id) {
    if (!THEMES[id] || id === this._currentId) return;
    this._currentId = id;
    this._current = getTheme(id);
    localStorage.setItem(THEME_KEY, id);
    this._applyCSS();
    EventBus.emit('theme-changed', this._current);
  }

  /** Cycle to the next theme */
  cycleTheme() {
    const idx = THEME_LIST.indexOf(this._currentId);
    const next = THEME_LIST[(idx + 1) % THEME_LIST.length];
    this.setTheme(next);
  }

  /** Get ordered list of all themes (for UI) */
  getAllThemes() {
    return THEME_LIST.map(id => ({
      id,
      name: THEMES[id].name,
      description: THEMES[id].description,
      active: id === this._currentId,
    }));
  }

  // ── Phaser helpers ──────────────────────────────────

  /** Get the Phaser effect config for current theme */
  getPhaserConfig() {
    return this._current.phaser;
  }

  /** Get the particle config for current theme (or null) */
  getParticleConfig() {
    return this._current.particles;
  }

  /** Get overworld UI overrides */
  getOverworldUI() {
    return this._current.overworldUI;
  }

  // ── Internal ────────────────────────────────────────

  /** Apply CSS custom properties to :root */
  _applyCSS() {
    const root = document.documentElement;
    const css = this._current.css;
    if (!css) return;

    for (const [prop, value] of Object.entries(css)) {
      // Skip non-CSS values (hex numbers for Phaser)
      if (typeof value === 'number') continue;
      root.style.setProperty(prop, value);
    }
  }
}

/** Singleton instance */
const themeManager = new ThemeManager();
export default themeManager;
