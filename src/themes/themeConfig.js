/**
 * Theme Configuration System
 *
 * Each theme is a plain config object. To add a new theme:
 * 1. Add a new entry to THEMES below
 * 2. Optionally add new particle textures to public/assets/particles/
 * 3. That's it — the theme manager handles CSS injection + Phaser effects
 */

export const THEMES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Retro pixel-art style',

    // --- CSS Variables (injected onto :root) ---
    css: {
      // Primary accent
      '--theme-primary': '#FFD700',
      '--theme-primary-rgb': '255, 215, 0',
      // Backgrounds
      '--theme-bg': '#000000',
      '--theme-bg-secondary': '#1a1a2e',
      '--theme-bg-panel': '#ffffff',
      '--theme-bg-overlay': 'rgba(0, 0, 0, 0.9)',
      // Text
      '--theme-text': 'rgba(255, 255, 255, 0.87)',
      '--theme-text-dark': '#000000',
      '--theme-text-muted': '#666666',
      // Borders
      '--theme-border': '#FFD700',
      '--theme-border-dark': '#000000',
      // Battle UI
      '--theme-battle-bg': '#000000',
      '--theme-battle-panel': '#ffffff',
      '--theme-battle-panel-border': '#000000',
      '--theme-battle-panel-shadow': '0 6px 0 #000',
      // HP colors
      '--theme-hp-high': 'linear-gradient(to right, #66bb6a, #4caf50)',
      '--theme-hp-medium': 'linear-gradient(to right, #ffee58, #fdd835)',
      '--theme-hp-low': 'linear-gradient(to right, #ef5350, #e53935)',
      '--theme-hp-label': '#ef5350',
      // Result screen
      '--theme-result-bg': 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)',
      '--theme-result-victory-border': '#4CAF50',
      '--theme-result-defeat-border': '#FF6B6B',
      '--theme-result-defeat-bg': 'linear-gradient(160deg, #3b1f2a 0%, #2a0f16 45%, #1f0b12 100%)',
      // Success / error
      '--theme-success': '#4CAF50',
      '--theme-error': '#FF6B6B',
      '--theme-xp': '#FFD700',
      // Answer items
      '--theme-answer-bg': '#f8f8f8',
      '--theme-answer-border': '#d0d0d0',
      '--theme-answer-active-bg': '#fffbea',
      '--theme-answer-active-shadow': '#ffd700',
      // Correct/wrong bars
      '--theme-correct-bg': 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
      '--theme-correct-border': '#2e7d32',
      '--theme-wrong-bg': 'linear-gradient(135deg, #ef5350 0%, #f44336 100%)',
      '--theme-wrong-border': '#c62828',
      // Font
      '--theme-font': "'Press Start 2P', monospace, sans-serif",
      // Minimap
      '--theme-minimap-bg': 0x002b36,
      '--theme-minimap-border': 0xFFD700,
    },

    // --- Phaser Overworld Effects ---
    phaser: {
      // Camera tint (null = no tint, or {r, g, b} 0-255 for color grading)
      cameraTint: null,
      // Pipeline/shader name (null = none)
      pipeline: null,
      // World tint applied to tilemap layers (null = no tint)
      worldTint: null,
      // Ambient light level (1.0 = full bright)
      ambientLight: 1.0,
    },

    // --- Particle System Config ---
    particles: null, // No ambient particles for classic

    // --- Overworld UI overrides ---
    overworldUI: {
      segmentLabelColor: '#FFD700',
      minimapBorderColor: 0xFFD700,
      minimapBgColor: 0x002b36,
    },
  },

  cozy: {
    id: 'cozy',
    name: 'Cozy Pastel',
    description: 'Soft & warm, Moonstone vibes',

    css: {
      '--theme-primary': '#F2A7C3',
      '--theme-primary-rgb': '242, 167, 195',
      '--theme-bg': '#1E1B2E',
      '--theme-bg-secondary': '#2A2540',
      '--theme-bg-panel': '#FFF5F8',
      '--theme-bg-overlay': 'rgba(30, 27, 46, 0.92)',
      '--theme-text': 'rgba(255, 245, 248, 0.92)',
      '--theme-text-dark': '#3D2B3D',
      '--theme-text-muted': '#9B8A9B',
      '--theme-border': '#F2A7C3',
      '--theme-border-dark': '#5C4A5C',
      '--theme-battle-bg': '#1E1B2E',
      '--theme-battle-panel': '#FFF5F8',
      '--theme-battle-panel-border': '#E8B4C8',
      '--theme-battle-panel-shadow': '0 6px 0 #D4A0B4',
      '--theme-hp-high': 'linear-gradient(to right, #A8E6CF, #88D8B0)',
      '--theme-hp-medium': 'linear-gradient(to right, #FFE0AC, #FFDAB9)',
      '--theme-hp-low': 'linear-gradient(to right, #FFB3BA, #FF9AA2)',
      '--theme-hp-label': '#FF9AA2',
      '--theme-result-bg': 'linear-gradient(135deg, #2A2540 0%, #3D2B50 100%)',
      '--theme-result-victory-border': '#A8E6CF',
      '--theme-result-defeat-border': '#FFB3BA',
      '--theme-result-defeat-bg': 'linear-gradient(160deg, #3D2040 0%, #2A1530 45%, #1E1020 100%)',
      '--theme-success': '#A8E6CF',
      '--theme-error': '#FFB3BA',
      '--theme-xp': '#FFE0AC',
      '--theme-answer-bg': '#FFF0F5',
      '--theme-answer-border': '#E8C8D8',
      '--theme-answer-active-bg': '#FFF5E6',
      '--theme-answer-active-shadow': '#F2A7C3',
      '--theme-correct-bg': 'linear-gradient(135deg, #A8E6CF 0%, #88D8B0 100%)',
      '--theme-correct-border': '#6BC4A0',
      '--theme-wrong-bg': 'linear-gradient(135deg, #FFB3BA 0%, #FF9AA2 100%)',
      '--theme-wrong-border': '#E87D85',
      '--theme-font': "'Press Start 2P', monospace, sans-serif",
      '--theme-minimap-bg': 0x2A2540,
      '--theme-minimap-border': 0xF2A7C3,
    },

    phaser: {
      cameraTint: null,
      pipeline: null,
      // Warm pastel tint on world layers
      worldTint: 0xFFE8F0,
      ambientLight: 1.0,
    },

    particles: {
      type: 'fireflies',
      count: 18,
      // Each particle: small glowing dot, drifting slowly
      config: {
        colors: [0xFFE0AC, 0xF2A7C3, 0xA8E6CF, 0xFFFFE0],
        minSize: 2,
        maxSize: 5,
        minAlpha: 0.2,
        maxAlpha: 0.7,
        minSpeed: 5,
        maxSpeed: 15,
        minLifespan: 4000,
        maxLifespan: 8000,
        drift: true,
        glow: true,
      }
    },

    overworldUI: {
      segmentLabelColor: '#F2A7C3',
      minimapBorderColor: 0xF2A7C3,
      minimapBgColor: 0x2A2540,
    },
  },

  jrpgNight: {
    id: 'jrpgNight',
    name: 'JRPG Night',
    description: 'Moody night, Sea of Stars vibes',

    css: {
      '--theme-primary': '#7EB8DA',
      '--theme-primary-rgb': '126, 184, 218',
      '--theme-bg': '#0A0E1A',
      '--theme-bg-secondary': '#121828',
      '--theme-bg-panel': '#E8EEF4',
      '--theme-bg-overlay': 'rgba(10, 14, 26, 0.94)',
      '--theme-text': 'rgba(200, 220, 240, 0.92)',
      '--theme-text-dark': '#1A2030',
      '--theme-text-muted': '#6080A0',
      '--theme-border': '#7EB8DA',
      '--theme-border-dark': '#2A3A50',
      '--theme-battle-bg': '#0A0E1A',
      '--theme-battle-panel': '#E8EEF4',
      '--theme-battle-panel-border': '#7EB8DA',
      '--theme-battle-panel-shadow': '0 6px 0 #2A3A50',
      '--theme-hp-high': 'linear-gradient(to right, #5CB870, #48A060)',
      '--theme-hp-medium': 'linear-gradient(to right, #E8D44D, #D4C040)',
      '--theme-hp-low': 'linear-gradient(to right, #D45050, #C04040)',
      '--theme-hp-label': '#D45050',
      '--theme-result-bg': 'linear-gradient(135deg, #0A0E1A 0%, #1A2838 100%)',
      '--theme-result-victory-border': '#5CB870',
      '--theme-result-defeat-border': '#D45050',
      '--theme-result-defeat-bg': 'linear-gradient(160deg, #1A1020 0%, #120818 45%, #0A0610 100%)',
      '--theme-success': '#5CB870',
      '--theme-error': '#D45050',
      '--theme-xp': '#E8D44D',
      '--theme-answer-bg': '#E0E8F0',
      '--theme-answer-border': '#B0C0D0',
      '--theme-answer-active-bg': '#D0E0F0',
      '--theme-answer-active-shadow': '#7EB8DA',
      '--theme-correct-bg': 'linear-gradient(135deg, #5CB870 0%, #48A060 100%)',
      '--theme-correct-border': '#308048',
      '--theme-wrong-bg': 'linear-gradient(135deg, #D45050 0%, #C04040 100%)',
      '--theme-wrong-border': '#902828',
      '--theme-font': "'Press Start 2P', monospace, sans-serif",
      '--theme-minimap-bg': 0x0A0E1A,
      '--theme-minimap-border': 0x7EB8DA,
    },

    phaser: {
      cameraTint: null,
      pipeline: null,
      // Dark blue night tint on world
      worldTint: 0x8090C0,
      ambientLight: 0.6,
    },

    particles: {
      type: 'stars',
      count: 25,
      config: {
        colors: [0xFFFFFF, 0xCCDDFF, 0xAABBEE, 0xE8D44D],
        minSize: 1,
        maxSize: 3,
        minAlpha: 0.1,
        maxAlpha: 0.8,
        minSpeed: 0,
        maxSpeed: 2,
        minLifespan: 3000,
        maxLifespan: 10000,
        drift: false,
        glow: true,
        twinkle: true,
      }
    },

    overworldUI: {
      segmentLabelColor: '#7EB8DA',
      minimapBorderColor: 0x7EB8DA,
      minimapBgColor: 0x0A0E1A,
    },
  },
};

/** Ordered list of theme IDs for cycling / UI display */
export const THEME_LIST = Object.keys(THEMES);

/** Get a theme config by ID, falls back to classic */
export function getTheme(id) {
  return THEMES[id] || THEMES.classic;
}

/** Get default theme ID */
export const DEFAULT_THEME = 'classic';
