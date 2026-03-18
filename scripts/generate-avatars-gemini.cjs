#!/usr/bin/env node
/**
 * generate-avatars-gemini.cjs
 * Generates pixel art NPC avatars using Google Gemini (Imagen/Nano Banana Pro)
 *
 * Usage: GEMINI_API_KEY=... node scripts/generate-avatars-gemini.cjs
 * Or reads from .env.local
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const QUESTIONS_PATH = path.join(__dirname, '..', 'public', 'assets', 'questions.json');
const AVATARS_DIR = path.join(__dirname, '..', 'public', 'assets', 'avatars');

// Load API key from env or .env.local
let API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  try {
    const envLocal = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    const match = envLocal.match(/GEMINI_API_KEY=(.+)/);
    if (match) API_KEY = match[1].trim();
  } catch {}
}

if (!API_KEY) {
  console.error('No GEMINI_API_KEY found. Set env var or add to .env.local');
  process.exit(1);
}

// Mythological creature descriptions for each NPC
const NPC_CREATURES = {
  // Chapter 1: The Library — wise/scholarly creatures
  "Lipidus the Wise": "a wise old owl sage wearing spectacles and a purple wizard robe, holding an open book",
  "Nurse Heartwell": "a gentle unicorn healer with a red cross on its forehead and a nurse cap, white coat",
  "The Cholesterol Sage": "an ancient tortoise scholar with a long white beard, wearing scholarly robes",
  "Fatty the Friendly": "a cheerful round golden retriever alchemist with a potion belt, friendly face",
  "Elder Plaque": "a stone golem guardian made of crystallized minerals, glowing red eyes, imposing but wise",

  // Chapter 2: The Clinic — scientific/precise creatures
  "Dr. Panela": "a fox doctor in a white lab coat with a stethoscope, holding a clipboard",
  "Lab Tech Luna": "a silver moon rabbit in goggles and a lab coat, surrounded by test tubes",
  "The Number Cruncher": "a mechanical clockwork beetle with brass gears, wearing tiny spectacles",
  "Range Ranger": "a hawk ranger with a feathered hat and compass, perched alertly",
  "Fasting Frank": "a lean wolf warrior with a determined expression, wearing light armor",

  // Chapter 3: The Lab — mysterious/dangerous creatures
  "Professor Particle": "a wise octopus scientist with eight arms each holding different lab instruments",
  "Apolipora": "a glowing jellyfish entity floating in purple light, ethereal and mysterious",
  "The LDL Hunter": "a sleek black panther tracker with glowing green eyes, crouching stance",
  "Dense Debbie": "a tiny fierce hedgehog with spiky quills, wearing a tiny detective hat",
  "Lp(a) the Ghost": "a spectral wraith made of translucent blue-white mist, haunting and barely visible",

  // Chapter 4: The Garden — nature/earth creatures
  "Chef Olive": "a plump happy bear chef in a white chef hat and apron, holding a wooden spoon",
  "Cardio Kate": "a swift deer athlete in running gear, muscular and graceful, mid-stride",
  "The Mediterranean Monk": "a peaceful zen frog monk in orange robes, meditating on a lily pad",
  "Fiber the Fox": "a clever red fox with a basket of fruits and vegetables, bushy tail",
  "Coach Vitale": "a strong lion coach with a whistle around neck, muscular, wearing a headband",

  // Chapter 5: The Apothecary — magical/alchemical creatures
  "Dr. Statina": "an elegant crane apothecary mixing potions, long graceful neck, wearing an alchemist robe",
  "Eze the Absorber": "a sponge-like sea creature that glows when absorbing, translucent coral entity",
  "PCSK9 the Guardian": "an armored dragon knight with a golden shield, protective stance, noble",
  "Inclisiran the Whisperer": "a mystical snake with iridescent scales, coiled around a staff with a glowing crystal",
  "Omega Rex": "a large friendly whale with crystalline blue markings, ancient and powerful",

  // Chapter 6: The Temple — divine/cosmic creatures
  "High Priestess Risk": "a regal phoenix with flames of red and gold, perched on an altar, wise eyes",
  "Calcium the Seer": "a crystal dragon with see-through scales showing inner structure, third eye glowing",
  "The Lifestyle Oracle": "a majestic white stag with golden antlers that glow like tree branches",
  "Aspirin the Fallen": "a fallen angel warrior with one broken wing, scarred but dignified, grey armor",
  "Inflammation the Shadow": "a dark flame elemental wreathed in smoky fire, menacing red-orange eyes"
};

function nameToFileName(name) {
  return name.replace(/\s+/g, '-').replace(/[()]/g, '') + '_pixel_art.png';
}

async function generateImage(prompt) {
  // Use Imagen 4.0 for image generation
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;

  const body = JSON.stringify({
    instances: [{
      prompt: `Pixel art RPG character portrait of ${prompt}. Style: 16-bit SNES era RPG, vibrant colors, clean pixel art, dark background, fantasy game aesthetic, facing forward, centered, square format, retro game sprite`
    }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1"
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message));
            return;
          }
          // Imagen returns predictions[].bytesBase64Encoded
          const predictions = json.predictions || [];
          if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
            resolve(Buffer.from(predictions[0].bytesBase64Encoded, 'base64'));
            return;
          }
          // Fallback: try Gemini-style response
          const parts = json.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
              resolve(Buffer.from(part.inlineData.data, 'base64'));
              return;
            }
          }
          reject(new Error('No image in response: ' + JSON.stringify(json).substring(0, 200)));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf8'));

  console.log(`Generating ${data.episodes.length} avatars using Gemini...`);

  let success = 0;
  let failed = 0;

  for (const ep of data.episodes) {
    const name = ep.guest;
    const creature = NPC_CREATURES[name];
    if (!creature) {
      console.log(`  [SKIP] No creature description for: ${name}`);
      failed++;
      continue;
    }

    const fileName = nameToFileName(name);
    const filePath = path.join(AVATARS_DIR, fileName);

    // Skip if already generated (>10KB = real image)
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10000) {
      console.log(`  [SKIP] ${name} — already generated`);
      success++;
      continue;
    }

    try {
      console.log(`  Generating: ${name} — ${creature.substring(0, 50)}...`);
      const imageBuffer = await generateImage(creature);
      fs.writeFileSync(filePath, imageBuffer);

      // Also remove old SVG placeholder
      const svgPath = filePath.replace('.png', '.svg');
      if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath);
      // Remove old SVG-as-PNG placeholder
      const oldPng = path.join(AVATARS_DIR, nameToFileName(name));
      // The PNG we just wrote is the real one now

      success++;
      console.log(`  [OK] ${name} → ${fileName}`);

      // Rate limit: 2 second delay between calls
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} generated, ${failed} failed`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
