/**
 * Stage Configuration — reads from the active game config.
 *
 * The stage layout (which NPCs appear in which chapter) is defined in
 * each game's config file (e.g. src/platform/games/lipid-wizard.js).
 * This module provides the same API the rest of the codebase expects.
 */

import { getActiveGame } from '../platform/GameConfig.js';

/** @returns {string[][]} */
function getStages() {
  return getActiveGame().stages;
}

/** @returns {Object<string,string>} */
function getAliases() {
  return getActiveGame().stageNameAliases || {};
}

// Re-export for backward compat (modules that import the array directly)
export const STAGE_CONFIG = /*@__PURE__*/ (() => getStages())();
export const STAGE_NAME_ALIASES = /*@__PURE__*/ (() => getAliases())();

/**
 * Get opponents for a specific stage (1-indexed)
 */
export function getStageOpponents(stageNumber) {
  const stages = getStages();
  const index = stageNumber - 1;
  if (index < 0 || index >= stages.length) {
    console.warn(`Invalid stage number: ${stageNumber}`);
    return [];
  }
  return stages[index];
}

/**
 * Get total number of stages
 */
export function getTotalStages() {
  return getStages().length;
}

/**
 * Get the tier number for a guest by name (1-indexed)
 */
export function getGuestTier(guestName) {
  const stages = getStages();
  for (let tierIndex = 0; tierIndex < stages.length; tierIndex++) {
    if (stages[tierIndex].includes(guestName)) {
      return tierIndex + 1;
    }
  }
  console.warn(`Guest "${guestName}" not found in StageConfig`);
  return 1;
}
