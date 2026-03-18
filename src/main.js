/**
 * QuestForge Platform — Entry Point
 *
 * 1. Resolve which game to load (from URL param, embed attribute, or default)
 * 2. Load the game config and set it as the active game
 * 3. Update document meta tags for the loaded game
 * 4. Dynamically import Vue + App and mount
 *
 * The dynamic import in step 4 is critical: it ensures that constants.js
 * (and every module that imports it) is evaluated AFTER the game config
 * is available, so all game-specific values resolve correctly.
 */

import { loadGame } from './platform/GameLoader.js';

// Update HTML <head> meta tags to match the loaded game
function applyMetaTags(config) {
  document.title = config.meta.title;

  const setMeta = (attr, key, value) => {
    const el = document.querySelector(`meta[${attr}="${key}"]`);
    if (el) el.setAttribute('content', value);
  };

  setMeta('name', 'title', config.meta.title);
  setMeta('name', 'description', config.meta.description);
  setMeta('name', 'keywords', config.meta.keywords);
  setMeta('name', 'author', config.meta.author);

  setMeta('property', 'og:title', config.meta.title);
  setMeta('property', 'og:description', config.meta.description);
  setMeta('property', 'og:url', config.url);
  setMeta('property', 'og:image', `${config.url}/${config.ogImageFilename}`);
  setMeta('property', 'og:site_name', config.name);

  setMeta('name', 'twitter:title', config.name);
  setMeta('name', 'twitter:description', config.meta.description);
  setMeta('name', 'twitter:url', config.url);
  setMeta('name', 'twitter:image', `${config.url}/${config.ogImageFilename}`);

  // Update canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', config.url);

  // Update apple-mobile-web-app-title
  setMeta('name', 'apple-mobile-web-app-title', config.name);
}

async function boot() {
  try {
    // Step 1+2: resolve slug and load game config
    const config = await loadGame();

    // Step 3: update document meta for SEO / social sharing
    applyMetaTags(config);

    // Step 4: dynamically import Vue app (constants.js is now safe to evaluate)
    const [{ createApp }, { default: App }] = await Promise.all([
      import('vue'),
      import('./App.vue'),
    ]);

    createApp(App).mount('#app');
  } catch (err) {
    console.error('[QuestForge] Failed to boot:', err);
    document.getElementById('app').innerHTML =
      '<div style="color:#fff;padding:2rem;font-family:monospace;">' +
      '<h2>Failed to load game</h2>' +
      `<p>${err.message}</p></div>`;
  }
}

boot();
