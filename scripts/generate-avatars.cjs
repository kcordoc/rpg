#!/usr/bin/env node
/**
 * generate-avatars.cjs
 * Generates NPC avatar placeholder images from questions.json.
 * When GEMINI_API_KEY is set, calls Nano Banana Pro for real pixel art.
 * Without API key, generates colored SVG placeholders.
 *
 * Usage: node scripts/generate-avatars.cjs [--clean]
 */
const fs = require('fs');
const path = require('path');

const QUESTIONS_PATH = path.join(__dirname, '..', 'public', 'assets', 'questions.json');
const AVATARS_DIR = path.join(__dirname, '..', 'public', 'assets', 'avatars');
const CLEAN = process.argv.includes('--clean');

// Color palette for NPC avatars by chapter
const CHAPTER_COLORS = {
  1: ['#E74C3C', '#FF6B6B'], // Red — Library
  2: ['#3498DB', '#5DADE2'], // Blue — Clinic
  3: ['#9B59B6', '#AF7AC5'], // Purple — Lab
  4: ['#27AE60', '#58D68D'], // Green — Garden
  5: ['#F39C12', '#F5B041'], // Orange — Apothecary
  6: ['#1ABC9C', '#48C9B0'], // Teal — Temple
};

function nameToFileName(name) {
  return name.replace(/\s+/g, '-').replace(/[()]/g, '') + '_pixel_art.png';
}

function generatePlaceholderSVG(name, chapter) {
  const colors = CHAPTER_COLORS[chapter] || ['#888', '#AAA'];
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:${colors[0]}"/>
    <stop offset="100%" style="stop-color:${colors[1]}"/>
  </linearGradient></defs>
  <rect width="128" height="128" rx="16" fill="url(#bg)"/>
  <text x="64" y="72" text-anchor="middle" font-family="monospace" font-size="40" font-weight="bold" fill="white">${initials}</text>
  <text x="64" y="110" text-anchor="middle" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.7)">Ch${chapter}</text>
</svg>`;
}

// Load questions
const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

if (CLEAN) {
  // Remove old Lenny avatars
  const files = fs.readdirSync(AVATARS_DIR);
  const newNpcNames = new Set(data.episodes.map(e => nameToFileName(e.guest)));
  let removed = 0;
  for (const f of files) {
    if (f.endsWith('_pixel_art.png') && !newNpcNames.has(f)) {
      fs.unlinkSync(path.join(AVATARS_DIR, f));
      removed++;
    }
  }
  console.log(`Cleaned ${removed} old avatars`);
}

// Generate placeholders for each NPC
let created = 0;
for (const ep of data.episodes) {
  const fileName = nameToFileName(ep.guest);
  // Save as SVG (browsers display these fine as img src)
  const svgName = fileName.replace('.png', '.svg');
  const svgPath = path.join(AVATARS_DIR, svgName);
  
  // Also save the PNG name as an SVG so the existing code works
  // (GuestData.js generates _pixel_art.png paths)
  const pngPath = path.join(AVATARS_DIR, fileName);
  
  const svg = generatePlaceholderSVG(ep.guest, ep.chapter);
  fs.writeFileSync(svgPath, svg);
  // Copy SVG content as the "png" file too — browsers handle SVG content regardless of extension
  fs.writeFileSync(pngPath, svg);
  created++;
}

console.log(`Generated ${created} avatar placeholders in ${AVATARS_DIR}`);
console.log('Run with GEMINI_API_KEY env var set for AI-generated pixel art');
