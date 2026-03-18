/**
 * GameLoader — resolves a game slug and loads its config.
 *
 * Resolution order:
 *   1. URL path   e.g. lipiwiz.com/play  → matched against game route configs
 *   2. ?game=     e.g. ?game=lipid-wizard
 *   3. data-game  attribute on #app element (for iframe embeds)
 *   4. DEFAULT_GAME_SLUG from platform config
 *
 * Currently loads from local JS modules in ./games/.
 * Future: fetch from Supabase `games` table by slug.
 */

import { DEFAULT_GAME_SLUG } from './config.js';
import { setActiveGame } from './GameConfig.js';

/**
 * Local game registry.
 * Each key is a slug, each value is a dynamic import function.
 * When games come from the DB this map becomes a fallback for built-in games.
 */
const LOCAL_GAMES = {
  'lipid-wizard': () => import('./games/lipid-wizard.js'),
};

/**
 * Route-to-slug mapping, built from game configs' `routes` arrays.
 * Populated lazily on first resolveGameSlug() call.
 * e.g. { '/play': 'lipid-wizard', '/lipid-wizard': 'lipid-wizard' }
 */
let routeMap = null;

/**
 * Build the route map by loading all local game configs.
 * For now this eagerly imports configs — acceptable with a small number of
 * local games. When games come from the DB, route resolution moves server-side.
 */
async function buildRouteMap() {
  if (routeMap) return routeMap;

  routeMap = {};
  for (const [slug, loader] of Object.entries(LOCAL_GAMES)) {
    const module = await loader();
    const config = module.default;
    if (Array.isArray(config.routes)) {
      for (const route of config.routes) {
        // Normalize: strip trailing slash, lowercase
        const normalized = route.replace(/\/+$/, '').toLowerCase() || '/';
        routeMap[normalized] = slug;
      }
    }
  }
  return routeMap;
}

/**
 * Determine which game slug to load.
 * @returns {Promise<string>} game slug
 */
export async function resolveGameSlug() {
  // 1. URL path — e.g. /play, /lipid-wizard
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase() || '/';
  const routes = await buildRouteMap();
  if (routes[path]) return routes[path];

  // 2. URL param  ?game=lipid-wizard
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('game');
  if (fromUrl) return fromUrl;

  // 3. data-game attribute on the app container (for embeds)
  //    e.g. <div id="app" data-game="lipid-wizard">
  const appEl = document.getElementById('app');
  if (appEl?.dataset.game) return appEl.dataset.game;

  // 4. Default
  return DEFAULT_GAME_SLUG;
}

/**
 * Load a game config by slug and set it as the active game.
 * @param {string} [slug] — if omitted, resolves from URL / default
 * @returns {Promise<Object>} the loaded game config
 */
export async function loadGame(slug) {
  const gameSlug = slug || await resolveGameSlug();

  // Try local registry first
  const localLoader = LOCAL_GAMES[gameSlug];
  if (localLoader) {
    const module = await localLoader();
    const config = module.default;
    setActiveGame(config);
    console.log(`[QuestForge] Loaded game: ${config.name} (${config.slug})`);
    return config;
  }

  // Future: fetch from Supabase
  // const { data, error } = await supabase
  //   .from('games')
  //   .select('config')
  //   .eq('slug', gameSlug)
  //   .single();

  throw new Error(
    `[QuestForge] Unknown game slug: "${gameSlug}". ` +
    `Available local games: ${Object.keys(LOCAL_GAMES).join(', ')}`
  );
}
