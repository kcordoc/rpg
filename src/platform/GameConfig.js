/**
 * GameConfig — schema and runtime state for the active game.
 *
 * Every game on the platform is described by a config object matching this shape.
 * The engine reads from `getActiveGame()` instead of hardcoded constants.
 *
 * Future: configs will be stored in Supabase and loaded via API.
 * For now: configs are local JS modules in ./games/.
 */

let activeGame = null;

/**
 * Required fields every game config must provide.
 * Used for validation when a config is set.
 */
const REQUIRED_FIELDS = [
  'slug',
  'name',
  'subtitle',
  'description',
  'url',
  'questionsPath',
  'stages',
  'encounterMessages',
  'characterTypes',
];

/**
 * Set the active game config. Called once at boot before Vue mounts.
 * @param {Object} config — a game config object (see ./games/ for examples)
 */
export function setActiveGame(config) {
  for (const field of REQUIRED_FIELDS) {
    if (config[field] == null) {
      console.error(`Game config missing required field: "${field}"`);
    }
  }
  activeGame = Object.freeze(config);
}

/**
 * Get the active game config. All game-specific reads go through here.
 * @returns {Object} the frozen game config
 */
export function getActiveGame() {
  if (!activeGame) {
    throw new Error(
      'No active game config. Call setActiveGame() before accessing game config.'
    );
  }
  return activeGame;
}

/**
 * Check if a game config has been loaded.
 * @returns {boolean}
 */
export function hasActiveGame() {
  return activeGame !== null;
}
