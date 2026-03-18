/**
 * QuestForge Embed SDK
 *
 * Drop-in script that lets creators embed their game on any website.
 * Supports three embedding modes:
 *
 * ── 1. Web Component (recommended) ─────────────────────────────
 *   <script src="https://yourplatform.com/embed.js"></script>
 *   <questforge-game slug="lipid-wizard"></questforge-game>
 *
 * ── 2. Script + data attribute ──────────────────────────────────
 *   <div data-questforge="lipid-wizard"></div>
 *   <script src="https://yourplatform.com/embed.js"></script>
 *
 * ── 3. JavaScript API ───────────────────────────────────────────
 *   <script src="https://yourplatform.com/embed.js"></script>
 *   <script>
 *     QuestForge.mount('#my-container', {
 *       slug: 'lipid-wizard',
 *       width: '960px',
 *       height: '640px',
 *     });
 *   </script>
 *
 * All three modes create a responsive container with the game loaded inside.
 * The game runs in an iframe for full CSS/JS isolation from the host page.
 */

(function () {
  'use strict';

  // ─── Configuration ───────────────────────────────────────────
  // In production, this should point to where the platform is deployed.
  // For development, the embed script auto-detects its own origin.
  const PLATFORM_ORIGIN = detectPlatformOrigin();

  function detectPlatformOrigin() {
    // Try to detect from the script tag that loaded us
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      if (script.src.includes('embed.js') || script.src.includes('embed.min.js')) {
        try {
          const url = new URL(script.src);
          return url.origin;
        } catch (_) { /* fall through */ }
      }
    }
    // Fallback: same origin
    return window.location.origin;
  }

  // ─── Default embed options ───────────────────────────────────
  const DEFAULTS = {
    width: '100%',
    height: '100%',
    aspectRatio: '3 / 2',    // 960x640 = 3:2
    maxWidth: '960px',
    borderRadius: '8px',
    allowFullscreen: true,
  };

  // ─── Build game URL ──────────────────────────────────────────
  function buildGameUrl(slug, params = {}) {
    const url = new URL(PLATFORM_ORIGIN);
    url.searchParams.set('game', slug);
    url.searchParams.set('embed', '1'); // Tells the game it's embedded

    // Forward any extra params (e.g. challenge mode)
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'slug') {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  // ─── Create responsive container + iframe ────────────────────
  function createGameElement(slug, options = {}) {
    const opts = { ...DEFAULTS, ...options };

    // Outer wrapper — responsive, respects aspect ratio
    const wrapper = document.createElement('div');
    wrapper.className = 'questforge-embed';
    wrapper.style.cssText = `
      position: relative;
      width: ${opts.width};
      max-width: ${opts.maxWidth};
      aspect-ratio: ${opts.aspectRatio};
      margin: 0 auto;
      background: #000;
      border-radius: ${opts.borderRadius};
      overflow: hidden;
    `;

    // iframe — game runs fully isolated
    const iframe = document.createElement('iframe');
    iframe.src = buildGameUrl(slug, opts.params || {});
    iframe.title = opts.title || 'QuestForge Game';
    iframe.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    `;
    iframe.setAttribute('loading', 'lazy');

    if (opts.allowFullscreen) {
      iframe.setAttribute('allowfullscreen', '');
    }

    // Permissions policy — only what the game needs
    iframe.setAttribute('allow', 'fullscreen; autoplay; clipboard-write');

    wrapper.appendChild(iframe);
    return wrapper;
  }

  // ─── Web Component: <questforge-game> ────────────────────────
  class QuestForgeGame extends HTMLElement {
    static get observedAttributes() {
      return ['slug', 'width', 'height', 'max-width', 'aspect-ratio'];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.render();
      }
    }

    render() {
      const slug = this.getAttribute('slug');
      if (!slug) {
        this.innerHTML = '<p style="color:red;font-family:monospace;">[QuestForge] Missing slug attribute</p>';
        return;
      }

      const options = {};
      if (this.getAttribute('width'))        options.width = this.getAttribute('width');
      if (this.getAttribute('height'))       options.height = this.getAttribute('height');
      if (this.getAttribute('max-width'))    options.maxWidth = this.getAttribute('max-width');
      if (this.getAttribute('aspect-ratio')) options.aspectRatio = this.getAttribute('aspect-ratio');
      if (this.getAttribute('title'))        options.title = this.getAttribute('title');

      this.innerHTML = '';
      this.style.display = 'block';
      this.appendChild(createGameElement(slug, options));
    }
  }

  // Register the web component (if not already registered)
  if (!customElements.get('questforge-game')) {
    customElements.define('questforge-game', QuestForgeGame);
  }

  // ─── Auto-mount: data-questforge attribute ───────────────────
  function autoMount() {
    const targets = document.querySelectorAll('[data-questforge]');
    targets.forEach((el) => {
      // Skip if already mounted
      if (el.querySelector('.questforge-embed')) return;

      const slug = el.getAttribute('data-questforge');
      if (!slug) return;

      const options = {};
      if (el.dataset.width)       options.width = el.dataset.width;
      if (el.dataset.height)      options.height = el.dataset.height;
      if (el.dataset.maxWidth)    options.maxWidth = el.dataset.maxWidth;
      if (el.dataset.aspectRatio) options.aspectRatio = el.dataset.aspectRatio;
      if (el.dataset.title)       options.title = el.dataset.title;

      el.appendChild(createGameElement(slug, options));
    });
  }

  // Run auto-mount when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

  // ─── JavaScript API: QuestForge.mount() ──────────────────────
  window.QuestForge = window.QuestForge || {};

  /**
   * Mount a game into a container element.
   *
   * @param {string|HTMLElement} target — CSS selector or DOM element
   * @param {Object} options
   * @param {string} options.slug — Game slug (required)
   * @param {string} [options.width] — Container width (default: '100%')
   * @param {string} [options.maxWidth] — Max width (default: '960px')
   * @param {string} [options.aspectRatio] — Aspect ratio (default: '3 / 2')
   * @param {Object} [options.params] — Extra URL params (e.g. { challenge: 'npc-slug' })
   * @returns {HTMLElement} the embed wrapper element
   */
  window.QuestForge.mount = function (target, options = {}) {
    const container =
      typeof target === 'string' ? document.querySelector(target) : target;

    if (!container) {
      console.error(`[QuestForge] Target not found: ${target}`);
      return null;
    }

    if (!options.slug) {
      console.error('[QuestForge] options.slug is required');
      return null;
    }

    const el = createGameElement(options.slug, options);
    container.appendChild(el);
    return el;
  };

  /**
   * Generate embed code snippets for a game.
   * Useful for a "share/embed" UI in the creator dashboard.
   *
   * @param {string} slug — Game slug
   * @param {Object} [options] — Override defaults
   * @returns {Object} { webComponent, scriptTag, jsApi, iframe }
   */
  window.QuestForge.getEmbedCode = function (slug, options = {}) {
    const origin = options.origin || PLATFORM_ORIGIN;
    const gameUrl = buildGameUrl(slug);

    return {
      webComponent:
        `<script src="${origin}/embed.js"><\/script>\n` +
        `<questforge-game slug="${slug}"></questforge-game>`,

      scriptTag:
        `<div data-questforge="${slug}"></div>\n` +
        `<script src="${origin}/embed.js"><\/script>`,

      jsApi:
        `<div id="my-game"></div>\n` +
        `<script src="${origin}/embed.js"><\/script>\n` +
        `<script>\n` +
        `  QuestForge.mount('#my-game', { slug: '${slug}' });\n` +
        `<\/script>`,

      iframe:
        `<iframe src="${gameUrl}" ` +
        `width="960" height="640" ` +
        `style="border:none;max-width:100%;" ` +
        `allowfullscreen allow="fullscreen; autoplay; clipboard-write" ` +
        `title="${slug}"></iframe>`,
    };
  };
})();
