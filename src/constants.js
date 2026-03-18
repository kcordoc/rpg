/**
 * QuestForge Constants — Backward-compatible wrapper
 *
 * All values are derived from the active game config set by the platform loader.
 * Existing imports (e.g. `import { GAME_NAME } from './constants.js'`) continue
 * to work unchanged — they now resolve dynamically from the loaded game.
 *
 * IMPORTANT: This module must only be imported AFTER loadGame() has been called
 * in main.js. All Vue components and Phaser scenes satisfy this because they
 * are mounted/started after the game config is loaded.
 */

import { getActiveGame } from './platform/GameConfig.js';

// ─── Helper ──────────────────────────────────────────────────────
// Lazy getter — the game config is frozen at boot, so we read it once per access.
const g = () => getActiveGame();

// ─── Brand ──────────────────────────────────────────────────────
export const GAME_NAME        = /*@__PURE__*/ (() => g().name)();
export const GAME_SUBTITLE    = /*@__PURE__*/ (() => g().subtitle)();
export const GAME_SLUG        = /*@__PURE__*/ (() => g().slug)();
export const GAME_URL         = /*@__PURE__*/ (() => g().url)();
export const GAME_DESCRIPTION = /*@__PURE__*/ (() => g().description)();
export const COMPANY_NAME     = /*@__PURE__*/ (() => g().creator.name)();
export const GAME_THEME       = /*@__PURE__*/ (() => g().theme)();
export const GITHUB_URL       = '';

// ─── Meta / SEO ─────────────────────────────────────────────────
export const META_TITLE       = /*@__PURE__*/ (() => g().meta.title)();
export const META_DESCRIPTION = /*@__PURE__*/ (() => g().meta.description)();
export const META_KEYWORDS    = /*@__PURE__*/ (() => g().meta.keywords)();
export const META_AUTHOR      = /*@__PURE__*/ (() => g().meta.author)();
export const OG_IMAGE_URL     = /*@__PURE__*/ (() => `${g().url}/${g().ogImageFilename}`)();

// ─── localStorage Keys (namespaced per game) ────────────────────
export const SAVE_KEY              = /*@__PURE__*/ (() => `${g().slug}_save_data`)();
export const MUTE_KEY              = /*@__PURE__*/ (() => `${g().slug}-muted`)();
export const TUTORIAL_SEEN_KEY     = /*@__PURE__*/ (() => `${g().slug}-tutorial-seen`)();
export const LOCAL_LEADERBOARD_KEY = /*@__PURE__*/ (() => `${g().slug}-leaderboard`)();
export const THEME_KEY             = /*@__PURE__*/ (() => `${g().slug}-theme`)();

// ─── NPC & Encounter Copy ───────────────────────────────────────
export const ENCOUNTER_MESSAGES = /*@__PURE__*/ (() => g().encounterMessages)();

// ─── Battle Copy ────────────────────────────────────────────────
export const ENCOUNTER_PREFIX = /*@__PURE__*/ (() => g().encounterPrefix)();
export const BATTLE_WIN       = /*@__PURE__*/ (() => g().battleWin)();
export const BATTLE_LOSE      = /*@__PURE__*/ (() => g().battleLose)();

// ─── Share Copy ─────────────────────────────────────────────────
export const SHARE_TITLE = (playerName, level) => g().shareTitle(playerName, level);

export const CHALLENGE_TEXT = (npcName, score) => g().challengeText(npcName, score);

export const DYK_SHARE_SUFFIX = /*@__PURE__*/ (() => `\n\nLearn more: ${g().url}`)();

export const SHARE_CARD_FOOTER = /*@__PURE__*/ (() =>
  `Play ${g().name} at ${g().url.replace('https://', '')}`)();

export const SHARE_LINKEDIN_TEXT = (stats, accuracy, capturedCount, totalGuests, capturedNames) =>
  g().shareLinkedInText(stats, accuracy, capturedCount, totalGuests, capturedNames);

// ─── Tutorial Copy ──────────────────────────────────────────────
export const TUTORIAL_WALK = /*@__PURE__*/ (() => g().tutorialWalk)();

// ─── Title Screen ───────────────────────────────────────────────
export const TITLE_SCREEN_SUBTITLE = /*@__PURE__*/ (() => g().titleScreenSubtitle)();
export const TITLE_SCREEN_TAGLINE  = /*@__PURE__*/ (() => g().titleScreenTagline)();

// ─── Character Classes ─────────────────────────────────────────
export const CHARACTER_TYPES               = /*@__PURE__*/ (() => g().characterTypes)();
export const CHARACTER_CONTEXT_PLACEHOLDER = /*@__PURE__*/ (() => g().characterContextPlaceholder)();
export const CHARACTER_CONTEXT_MAX_LENGTH  = /*@__PURE__*/ (() => g().characterContextMaxLength)();

// ─── Mobile Warning ─────────────────────────────────────────────
export const MOBILE_WARNING = /*@__PURE__*/ (() =>
  `${g().name} works best in landscape mode. Please rotate your device to play!`)();

// ─── Collection Screen ──────────────────────────────────────────
export const COLLECTION_TITLE = /*@__PURE__*/ (() => g().collectionTitle)();

// ─── Episode / Learn More ───────────────────────────────────────
export const LEARN_MORE_LABEL  = /*@__PURE__*/ (() => g().learnMoreLabel)();
export const CREDITS_LINK_URL  = /*@__PURE__*/ (() => g().creditsLinkUrl)();
export const CREDITS_LINK_TEXT = /*@__PURE__*/ (() => g().creditsLinkText)();
export const CREDITS_TOOLTIP   = /*@__PURE__*/ (() => g().creditsTooltip)();
