/**
 * Embed Context — detects whether the game is running inside an embed.
 *
 * When the embed SDK loads the game via iframe, it appends ?embed=1.
 * Components can check `isEmbedded` to adjust UI (e.g. hide external
 * links, suppress credits, tweak layout).
 */

const params = new URLSearchParams(window.location.search);

/** True when the game is loaded inside an embed iframe */
export const isEmbedded = params.get('embed') === '1' ||
  window.self !== window.top; // also detect if we're in any iframe
