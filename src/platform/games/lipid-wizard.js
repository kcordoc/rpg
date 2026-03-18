/**
 * Lipid Wizard — Game Configuration
 *
 * The first game on the QuestForge platform.
 * Cholesterol / heart-health education RPG, hosted at lipiwiz.com.
 *
 * This file is the single source of truth for everything that makes
 * "Lipid Wizard" different from any other game on the platform.
 */

const config = {
  // ─── Identity ──────────────────────────────────────────────────
  slug: 'lipid-wizard',
  name: 'Lipid Wizard',
  subtitle: 'The Lipid Adventure',
  description:
    'Explore the Village of Heartwell and learn about heart disease prevention through an RPG adventure.',
  theme: 'heart-health',
  url: 'https://lipiwiz.com',
  isPublic: true,

  // ─── Creator ───────────────────────────────────────────────────
  creator: {
    name: 'CORDOC LLC',
    url: 'https://lipiwiz.com',
  },

  // ─── Content paths ─────────────────────────────────────────────
  // Relative to /public (served as static assets).
  // Future: these could be Supabase storage URLs.
  questionsPath: '/assets/questions.json',
  logoPath: 'GameLogo.png',           // loaded by Phaser (relative to assets/)
  ogImageFilename: 'OpenGraph.png',

  // ─── Stage / Chapter Config ────────────────────────────────────
  stages: [
    // Chapter 1: The Library — "What is Cholesterol?"
    [
      'Lipidus the Wise',
      'Nurse Heartwell',
      'The Cholesterol Sage',
      'Fatty the Friendly',
      'Elder Plaque',
    ],
    // Chapter 2: The Clinic — "Understanding Your Labs"
    [
      'Dr. Panela',
      'Lab Tech Luna',
      'The Number Cruncher',
      'Range Ranger',
      'Fasting Frank',
    ],
    // Chapter 3: The Lab — "LDL, ApoB, and Lp(a)"
    [
      'Professor Particle',
      'Apolipora',
      'The LDL Hunter',
      'Dense Debbie',
      'Lp(a) the Ghost',
    ],
    // Chapter 4: The Garden — "Diet and Lifestyle"
    [
      'Chef Olive',
      'Cardio Kate',
      'The Mediterranean Monk',
      'Fiber the Fox',
      'Coach Vitale',
    ],
    // Chapter 5: The Apothecary — "Medications"
    [
      'Dr. Statina',
      'Eze the Absorber',
      'PCSK9 the Guardian',
      'Inclisiran the Whisperer',
      'Omega Rex',
    ],
    // Chapter 6: The Temple — "Prevention and Risk"
    [
      'High Priestess Risk',
      'Calcium the Seer',
      'The Lifestyle Oracle',
      'Aspirin the Fallen',
      'Inflammation the Shadow',
    ],
  ],
  stageNameAliases: {},

  // ─── Character Classes ─────────────────────────────────────────
  characterTypes: [
    {
      id: 'scholar',
      name: 'Scholar',
      description: 'Wisdom seeker',
      tint: 0x6EA8FE,
      icon: '\u{1F4D6}',
    },
    {
      id: 'healer',
      name: 'Healer',
      description: 'Heart guardian',
      tint: 0x75D979,
      icon: '\u{1F49A}',
    },
    {
      id: 'knight',
      name: 'Knight',
      description: 'Brave protector',
      tint: 0xFF7B7B,
      icon: '\u{1F6E1}',
    },
    {
      id: 'explorer',
      name: 'Explorer',
      description: 'Curious wanderer',
      tint: 0xFFD700,
      icon: '\u{1F9ED}',
    },
  ],
  characterContextPlaceholder: 'e.g. "A med student learning lipids"',
  characterContextMaxLength: 200,

  // ─── NPC Encounter Copy ────────────────────────────────────────
  encounterMessages: [
    'challenges you to a knowledge battle!',
    'has a question for you!',
    'is ready for a health quiz!',
    'would like to test your knowledge!',
    'wants to see what you know!',
    'waves you over for a challenge!',
    'spotted you and smiles!',
    'wants to talk heart health!',
    'is up for a quick challenge!',
    'invites you to a knowledge duel!',
    'wants to compare notes!',
    'has a 3-question challenge!',
    'is eager to share what they know!',
    'is ready to learn together!',
    'has a quiz waiting for you!',
    'is excited to test you!',
    'has a quick prompt for you!',
    'would love your take on this!',
    'is hosting a mini quiz!',
    'is curious what you\'d choose!',
    'has some insights to test!',
    'has a challenge worth sharing!',
    'is ready for round one!',
    'has a short quiz queued up!',
    'wants your best answer!',
    'is ready to hear your reasoning!',
    'has a question from the village!',
    'is ready for a quick round!',
    'would like your opinion!',
    'is ready to explore an idea!',
  ],

  // ─── Battle Copy ───────────────────────────────────────────────
  encounterPrefix: 'challenges you to a knowledge battle!',
  battleWin: 'You captured',
  battleLose: 'retreated',

  // ─── Title Screen Copy ─────────────────────────────────────────
  titleScreenSubtitle: 'EXPLORE THE VILLAGE OF HEARTWELL',
  titleScreenTagline: 'Learn about heart health. Battle NPCs. Collect knowledge.',

  // ─── Tutorial Copy ─────────────────────────────────────────────
  tutorialWalk: 'Walk around the village to find heart health NPCs.',

  // ─── Share / Social Copy ───────────────────────────────────────
  shareTitle: (playerName, level) =>
    `${playerName} is a Level ${level} Heart Health Master!`,
  challengeText: (npcName, score) =>
    `I scored ${score}% against ${npcName}. Can you beat me?`,
  shareLinkedInText: (stats, accuracy, capturedCount, totalGuests, capturedNames) => {
    const guestsLine =
      capturedNames.length > 0
        ? 'Captured NPCs: ' + capturedNames.join(', ')
        : '';
    return `Just completed some heart health quizzes in Lipid Wizard!

This is a fun way to learn about cholesterol, lipids, and cardiovascular health — it's like Pokemon but with heart health experts.

My stats:
- Level ${stats.level} adventurer
- ${stats.totalBattles} battles won
- ${accuracy} percent accuracy
- Captured ${capturedCount} of ${totalGuests} NPCs
${guestsLine ? '\n' + guestsLine : ''}

Test your heart health knowledge!

Play now: https://lipiwiz.com`;
  },

  // ─── Collection Screen ─────────────────────────────────────────
  collectionTitle: 'Lipid Wizard Collection',

  // ─── Credits / Learn More ──────────────────────────────────────
  learnMoreLabel: 'Learn more about this topic',
  creditsLinkUrl: 'https://lipiwiz.com',
  creditsLinkText: 'Lipiwiz heart health topics',
  creditsTooltip:
    'Lipid Wizard is an educational RPG about heart health by CORDOC LLC. Learn about cholesterol, lipids, and cardiovascular disease prevention.',

  // ─── Meta / SEO ────────────────────────────────────────────────
  meta: {
    title: 'Lipid Wizard - Learn Heart Health | Educational RPG',
    description:
      'Explore the Village of Heartwell in this educational RPG. Battle heart health NPCs, answer quiz questions, and learn about cholesterol, lipids, and cardiovascular disease prevention. Free to play!',
    keywords:
      'heart health, cholesterol, lipid education, educational game, RPG game, cardiovascular, health quiz, heart disease prevention, lipid management, lipid wizard',
    author: 'CORDOC LLC',
  },
};

export default config;
