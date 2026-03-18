#!/usr/bin/env node
/**
 * generate-content.js
 * Reads heart health .md files and generates questions.json + StageConfig.js
 * Run: node scripts/generate-content.js
 */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'heart-health');
const OUTPUT_JSON = path.join(__dirname, '..', 'public', 'assets', 'questions.json');

// Chapter definitions
const CHAPTERS = [
  {
    file: '01-what-is-cholesterol.md',
    title: 'What is Cholesterol?',
    category: 'Cholesterol Basics',
    location: 'The Library',
    url: 'https://lipiwiz.com/topics/cholesterol',
    npcs: [
      { name: 'Lipidus the Wise', role: 'quizmaster' },
      { name: 'Nurse Heartwell', role: 'healer' },
      { name: 'The Cholesterol Sage', role: 'scholar' },
      { name: 'Fatty the Friendly', role: 'guide' },
      { name: 'Elder Plaque', role: 'boss' }
    ]
  },
  {
    file: '02-understanding-your-labs.md',
    title: 'Understanding Your Labs',
    category: 'Lab Results',
    location: 'The Clinic',
    url: 'https://lipiwiz.com/topics/labs',
    npcs: [
      { name: 'Dr. Panela', role: 'quizmaster' },
      { name: 'Lab Tech Luna', role: 'healer' },
      { name: 'The Number Cruncher', role: 'scholar' },
      { name: 'Range Ranger', role: 'guide' },
      { name: 'Fasting Frank', role: 'boss' }
    ]
  },
  {
    file: '03-ldl-apob-lpa.md',
    title: 'LDL, ApoB, and Lp(a)',
    category: 'Advanced Lipids',
    location: 'The Lab',
    url: 'https://lipiwiz.com/topics/ldl-apob',
    npcs: [
      { name: 'Professor Particle', role: 'quizmaster' },
      { name: 'Apolipora', role: 'healer' },
      { name: 'The LDL Hunter', role: 'scholar' },
      { name: 'Dense Debbie', role: 'guide' },
      { name: 'Lp(a) the Ghost', role: 'boss' }
    ]
  },
  {
    file: '04-diet-and-lifestyle.md',
    title: 'Diet and Lifestyle',
    category: 'Lifestyle',
    location: 'The Garden',
    url: 'https://lipiwiz.com/topics/diet',
    npcs: [
      { name: 'Chef Olive', role: 'quizmaster' },
      { name: 'Cardio Kate', role: 'healer' },
      { name: 'The Mediterranean Monk', role: 'scholar' },
      { name: 'Fiber the Fox', role: 'guide' },
      { name: 'Coach Vitale', role: 'boss' }
    ]
  },
  {
    file: '05-medications.md',
    title: 'Medications',
    category: 'Treatment',
    location: 'The Apothecary',
    url: 'https://lipiwiz.com/topics/medications',
    npcs: [
      { name: 'Dr. Statina', role: 'quizmaster' },
      { name: 'Eze the Absorber', role: 'healer' },
      { name: 'PCSK9 the Guardian', role: 'scholar' },
      { name: 'Inclisiran the Whisperer', role: 'guide' },
      { name: 'Omega Rex', role: 'boss' }
    ]
  },
  {
    file: '06-prevention-and-risk.md',
    title: 'Prevention and Risk',
    category: 'Prevention',
    location: 'The Temple',
    url: 'https://lipiwiz.com/topics/prevention',
    npcs: [
      { name: 'High Priestess Risk', role: 'quizmaster' },
      { name: 'Calcium the Seer', role: 'healer' },
      { name: 'The Lifestyle Oracle', role: 'scholar' },
      { name: 'Aspirin the Fallen', role: 'guide' },
      { name: 'Inflammation the Shadow', role: 'boss' }
    ]
  }
];

// All NPC question banks — defined per chapter per NPC index
const QUESTION_BANKS = require('./question-banks.cjs');

function generateEpisodes() {
  const episodes = [];
  const cliffhangers = [
    "But there's more to learn... the Clinic holds secrets about what your blood numbers really mean.",
    "You've learned the basics, but numbers can be deceiving. Head to the Lab to discover what's really in your blood.",
    "The particles tell a story, but can you change it? The Garden holds answers about food and movement.",
    "Diet helps, but sometimes the body needs more. The Apothecary has powerful remedies waiting.",
    "Medicines are tools, but the real power is prevention. The Temple holds the final secrets.",
    "You've uncovered the truth behind Heartwell's curse. But the journey to protect your heart never truly ends..."
  ];

  CHAPTERS.forEach((ch, ci) => {
    ch.npcs.forEach((npc, ni) => {
      const questions = QUESTION_BANKS[ci][ni];
      const isLast = ni === ch.npcs.length - 1;
      episodes.push({
        title: npc.name,
        guest: npc.name,
        category: ch.category,
        chapter: ci + 1,
        role: npc.role,
        greeting: questions._greeting,
        cliffhanger: isLast ? cliffhangers[ci] : questions._cliffhanger,
        knowledgeCard: questions._knowledgeCard,
        dialogue: questions._dialogue,
        url: ch.url,
        questions: questions._questions
      });
    });
  });
  return { episodes };
}

const data = generateEpisodes();
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(data, null, 2));
console.log(`Generated ${data.episodes.length} NPCs in ${OUTPUT_JSON}`);
console.log(`Chapters: ${CHAPTERS.length}, NPCs per chapter: 5`);
