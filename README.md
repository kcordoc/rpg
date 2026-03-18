# Heart Quest — The Lipid Adventure

An educational RPG where players explore the Village of Heartwell and learn about heart disease prevention through quiz battles with mythological creature NPCs.

## Play

Visit [lipiwiz.com/play](https://lipiwiz.com/play) to play.

## Features

- 30 NPCs across 6 chapters covering cholesterol, lab results, LDL/ApoB/Lp(a), diet, medications, and prevention
- Multi-message NPC dialogue with typewriter effect before quiz battles
- "Did You Know?" shareable fact cards with social proof stats
- Challenge friends via direct links
- Streak tracking and NPC memory (returning players get personalized greetings)
- Cliffhanger system that hooks players between sessions
- Knowledge Cards earned on capture

## Development

```bash
npm install
npm run dev
```

## Content Pipeline

```bash
# Generate questions.json + StageConfig.js from content docs
node scripts/generate-content.cjs

# Generate NPC avatars via Imagen 4.0
GEMINI_API_KEY=... node scripts/generate-avatars-gemini.cjs

# One-click pipeline
./scripts/seed-lipiwiz.sh
```

## Tech Stack

- **Engine:** Phaser 3.90 + Vue 3 + Vite
- **Content:** 6 heart health documents -> 151 quiz questions
- **Avatars:** Imagen 4.0 pixel art (mythological creatures)
- **Save:** localStorage with streak tracking

## License

MIT

Built by CORDOC LLC for [lipiwiz.com](https://lipiwiz.com).
