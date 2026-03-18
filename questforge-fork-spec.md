# QuestForge — Fork & Customize Spec
## "PokeLenny → QuestForge in 2 weeks"

> **Base repo:** github.com/hbshih/PokeLenny (MIT licensed, 147 commits)
> **Target:** lipiwiz.com/play — Heart Health Educational RPG
> **Build agent:** Claude Code (everything)
> **Pre-read:** questforge-game-design-bible.md (retention + viral principles)

---

## WHAT WE KEEP (DON'T TOUCH)

These systems work. Don't rewrite them.

| System | Files | Why Keep |
|--------|-------|----------|
| Phaser engine setup | `src/game/main.js`, `src/PhaserGame.vue` | Working Phaser ↔ Vue bridge |
| EventBus | `src/game/EventBus.js` | Simple, clean Vue ↔ Phaser events |
| Battle screen UI | `src/components/BattleScreen.vue` (1324 lines) | Full quiz battle with HP, XP, animations |
| Battle sub-components | `src/components/battle/` | Answer choices, HP bars, question display |
| XP/leveling system | Embedded in BattleScreen + App.vue | Working XP scaling, level-up logic |
| Overworld movement | `src/game/scenes/Overworld.js` core movement | Arrow keys, WASD, mobile touch, collision |
| NPC spawning on map | `Overworld.js` NPC creation logic | Random positioning, encounter zones |
| Music system | `src/game/MusicManager.js` + audio assets | Town, battle, victory, defeat themes |
| Leaderboard | `src/components/LeaderboardPanel.vue`, `src/services/` | Supabase real-time leaderboard |
| Collection screen | `src/components/CollectionScreen.vue` | Gallery of captured NPCs |
| Game over screen | `src/components/GameOver.vue` | HP death + restart flow |
| Level complete screen | `src/components/LevelComplete.vue` | Stage progression UI |
| Tutorial modal | `src/components/TutorialModal.vue` | How-to-play instructions |
| Vite build config | `vite/` | Dev + production builds |

---

## WHAT WE CHANGE (THE DELTA)

### CHANGE 1: Content Source — Static File → API-Loaded (or Generated Static File)

**Current:** `public/assets/questions.json` has 283 hardcoded podcast episodes.
**Target:** Generated `questions.json` from uploaded documents via CLI script.

The beauty: **the format stays the same.** GuestData.js already loads from
`questions.json`. We just generate a different one.

**Current format (keep this exactly):**
```json
{
  "episodes": [
    {
      "title": "Professor Particle",
      "guest": "Professor Particle",
      "category": "LDL & ApoB",
      "url": "https://lipiwiz.com/topics/ldl",
      "questions": [
        {
          "question": "Where is most cholesterol in your body produced?",
          "choices": [
            "Intestines",
            "Liver",
            "Kidneys",
            "Heart"
          ],
          "answer": "Liver",
          "explanation": "Your liver produces about 80% of your body's cholesterol. Diet only accounts for roughly 20%.",
          "difficulty": "Easy"
        }
      ]
    }
  ]
}
```

**New fields we ADD to each question (backwards compatible):**
```json
{
  "question": "Where is most cholesterol produced?",
  "choices": ["Intestines", "Liver", "Kidneys", "Heart"],
  "answer": "Liver",
  "explanation": "Your liver produces about 80%...",
  "difficulty": "Easy",
  "surpriseFactor": 8,
  "didYouKnowFact": "Your liver produces 80% of your body's cholesterol. Only 20% comes from food.",
  "shareText": "TIL your liver makes 80% of your cholesterol. Diet is only 20%. Mind = blown.",
  "correctPct": 23
}
```

**New fields we ADD to each episode/NPC (backwards compatible):**
```json
{
  "title": "Professor Particle",
  "guest": "Professor Particle",
  "category": "LDL & ApoB",
  "chapter": 3,
  "role": "quizmaster",
  "greeting": "Welcome to my laboratory! I've been studying tiny particles in the blood...",
  "cliffhanger": "But wait — there's a particle even more dangerous than LDL. Talk to the Arena champion to learn about Lp(a)...",
  "knowledgeCard": "LDL particles carry cholesterol through blood. ApoB counts them. Lp(a) is the hidden risk factor.",
  "dialogue": [
    { "text": "I've been analyzing blood samples from the village. Something strange is happening." },
    { "text": "Tiny particles are clogging the waterways. Some are harmless. Some are deadly." },
    { "text": "Let me test if you can tell the difference. Ready?" }
  ],
  "url": "https://lipiwiz.com/topics/ldl",
  "questions": [...]
}
```

**Implementation:** GuestData.js already handles missing fields gracefully.
We just add new optional fields. The existing battle system reads `questions`
array — that works unchanged. We add a dialogue phase BEFORE the battle.

---

### CHANGE 2: StageConfig.js → Generated from Chapters

**Current:** 28 hardcoded tiers of podcast guest names.
**Target:** 6 chapters, 5 NPCs each, generated from content.

```javascript
// src/game/StageConfig.js — REPLACE ENTIRELY

export const STAGE_CONFIG = [
  // Chapter 1: Library — "What is Cholesterol?"
  [
    "Lipidus the Wise",
    "Nurse Heartwell",
    "The Cholesterol Sage",
    "Fatty the Friendly",
    "Elder Plaque"
  ],
  // Chapter 2: Clinic — "Understanding Your Labs"
  [
    "Dr. Panela",
    "Lab Tech Luna",
    "The Number Cruncher",
    "Range Ranger",
    "Fasting Frank"
  ],
  // ... chapters 3-6
];

// This file is GENERATED by scripts/generate.ts
// Do not edit manually
```

The CLI generates this file from the GameContent JSON.

---

### CHANGE 3: Map Theme — Office → Village

**Current:** `pokelenny-large-map.json` — office/corporate themed large tilemap.
**Target:** Fantasy village tilemap.

**Approach:** Claude Code generates a new Tiled JSON map programmatically.
PokeLenny already has a `scripts/generate-large-map.js` that does this!
We modify it to generate a village layout instead of an office.

The Overworld.js reads the map generically — it doesn't care about theme,
only about tile layers (ground, buildings, collisions) and dimensions.

**What changes in the map:**
- Tileset: swap `tuxmon-sample-32px.png` for a fantasy village tileset
  (download from OpenGameArt or Kenney)
- Layout: village with paths, buildings, trees instead of office cubicles
- Same layer structure: Ground, World (buildings), Collisions
- Same NPC spawn logic (random positions within walkable zones per segment)

**Key constraint:** The Overworld.js uses segments (zones within the map) for
progression. Each segment = one stage/level. We keep 6 segments = 6 chapters.
The map just needs 6 visually distinct zones connected by paths.

---

### CHANGE 4: Avatars — Podcast Photos → Generated NPC Art

**Current:** 279 `*_pixel_art.png` files in `public/assets/avatars/`.
**Target:** ~30 NPC pixel art avatars generated by Nano Banana Pro.

CLI script generates them. Avatar file naming convention stays the same:
`{Name-With-Hyphens}_pixel_art.png` in `public/assets/avatars/`.
GuestData.js avatar path logic doesn't change.

---

### CHANGE 5: Add Pre-Battle Dialogue Phase

**Current flow:** Walk near NPC → EncounterDialog ("X wants to battle!") → Battle.
**New flow:** Walk near NPC → **Story Dialogue (2-3 boxes)** → EncounterDialog → Battle.

**Modify:** `src/components/EncounterDialog.vue`

Currently it shows a single message: "[Name] wants to challenge you!"
We extend it to show the NPC's `dialogue` array first (typewriter effect,
one box at a time, tap to advance), THEN show the battle prompt.

The typewriter effect and dialogue box UI **already exist** in EncounterDialog.vue.
We just feed it multiple messages instead of one.

```javascript
// In EncounterDialog.vue, modify the message flow:
// BEFORE: Single message → "SPACE to battle"
// AFTER: dialogue[0] → dialogue[1] → dialogue[2] → "SPACE to battle"

// The npcData already gets passed from Overworld.js via EventBus
// We just need to read npcData.dialogue array (new field from questions.json)
```

---

### CHANGE 6: Add Post-Battle Cliffhanger + "Did You Know?" Shares

**Current flow:** Battle ends → BattleResult shows XP/capture → back to map.
**New flow:** Battle ends → BattleResult → **Cliffhanger** → **Share options** → map.

**Modify:** `src/components/BattleResult.vue`

Add after the existing result display:

1. **Cliffhanger text** (from NPC's `cliffhanger` field):
   "But wait — talk to the Arena champion about Lp(a)..."

2. **Knowledge Card** (from NPC's `knowledgeCard` field):
   If captured, show a collectible card summary.

3. **"Did You Know?" share** (if any question had `surpriseFactor` ≥ 7):
   Show the most surprising fact from the battle + Share button.

4. **"Challenge a Friend"** button (if captured):
   Generates challenge URL + native share.

---

### CHANGE 7: Add Challenge Link System

**New files:**
- `src/components/ChallengeEntry.vue` — standalone 3-question quiz page
- Challenge URL: `?challenge=npc-name&from=PlayerName&score=100`

**When someone opens a challenge link:**
1. App.vue detects `?challenge=` parameter
2. Skips title screen + overworld
3. Shows ChallengeEntry component directly
4. Loads that NPC's questions from questions.json
5. Player answers 3 questions (same BattleScreen UI, simplified)
6. Shows score comparison: "You: 67% vs [Sender]: 100%"
7. CTA: "Explore the full village" → loads full game

**Implementation:** Lightweight — it's just a filtered view of the existing
BattleScreen.vue that loads one NPC's data directly.

---

### CHANGE 8: Persistent Save → Supabase

**Current:** `GameState.js` saves to `localStorage` only.
**Target:** Save to both localStorage (instant) AND Supabase (persistent).

**Modify:** `src/game/GameState.js`

Add `syncToSupabase()` method called after each `save()`:
```javascript
async syncToSupabase() {
    const { data, error } = await supabase
        .from('players')
        .upsert({
            game_slug: GAME_SLUG,
            anonymous_token: this.data.sessionId,
            player_name: this.data.playerName,
            save_data: this.data,
            xp: this.data.currentScore,
            level: this.getCurrentLevel(),
            captured_count: this.data.defeatedGuests.length
        }, { onConflict: 'game_slug,anonymous_token' })
}
```

Also add `loadFromSupabase()` for cross-device resume.

---

### CHANGE 9: Answer Stats for Social Proof

**New:** Track answer correctness per question across all players.

**New Supabase table:** `answer_stats` (game_slug, npc_id, question_index, total, correct)

After each answer in BattleScreen.vue, POST to Supabase:
```javascript
await supabase.from('answer_stats')
    .upsert({
        game_slug, npc_id, question_index,
        total: existingTotal + 1,
        correct: existingCorrect + (isCorrect ? 1 : 0)
    })
```

Display in BattleScreen.vue after each answer:
"✅ Only 23% of players get this right!" (from live stats, fallback to
`correctPct` from questions.json for first 100 answers)

---

### CHANGE 10: Rebrand All Copy → Constants File

**New file:** `src/constants.js`

Every hardcoded "LennyRPG", "Lenny's Podcast", "product knowledge", etc.
gets replaced with imports from constants.

```javascript
// src/constants.js
export const GAME_NAME = "Heart Quest"           // TODO: undecided
export const GAME_SUBTITLE = "The Lipid Adventure"
export const GAME_SLUG = "heart-quest"
export const GAME_URL = "https://lipiwiz.com/play"
export const GAME_DESCRIPTION = "Explore the Village of Heartwell and learn about heart disease prevention"
export const COMPANY_NAME = "CORDOC LLC"
export const GAME_THEME = "heart-health"

// NPC encounter messages
export const ENCOUNTER_PREFIX = "challenges you to a knowledge battle!"
export const BATTLE_WIN = "You captured"
export const BATTLE_LOSE = "retreated"

// Share copy
export const SHARE_TITLE = (playerName, level) =>
    `${playerName} is a Level ${level} Heart Health Master!`
export const CHALLENGE_TEXT = (npcName, score) =>
    `I scored ${score}% against ${npcName}. Can you beat me?`
export const DYK_SHARE_SUFFIX = `\n\nLearn more: ${GAME_URL}`

// ... all other copy from Game Design Bible
```

**Claude Code task:** After forking, grep the entire codebase for hardcoded
strings ("LennyRPG", "Lenny", "podcast", "product management", "PM", etc.)
and replace ALL with constants imports.

---

## WHAT WE ADD (NEW FILES)

### CLI Scripts (`scripts/`)

```
scripts/
├── ingest.ts          # Documents → processed text chunks
├── generate-content.ts # Chunks → questions.json + StageConfig.js
├── generate-avatars.ts # NPC names → pixel art PNGs via Nano Banana Pro
├── generate-map.js     # Modified from existing generate-large-map.js → village theme
└── seed-lipiwiz.sh     # One-click: ingest + generate + avatars for lipiwiz
```

**scripts/generate-content.ts** is the key script. It:
1. Reads document text from `content/` directory (or Supabase)
2. Chunks text (800 tokens, 150 overlap)
3. Calls Gemini 2.5 Flash with the master prompt (from Game Design Bible)
4. Outputs `public/assets/questions.json` in PokeLenny's exact format
   (with our added fields: dialogue, cliffhanger, knowledgeCard, etc.)
5. Outputs `src/game/StageConfig.js` with NPC names per chapter

**scripts/generate-avatars.ts:**
1. Reads NPC names from generated questions.json
2. For each NPC, calls Nano Banana Pro with the avatar style prompt
3. Saves to `public/assets/avatars/{Name}_pixel_art.png`

### New Vue Components

```
src/components/
├── (existing - modified)
│   ├── BattleScreen.vue     # Add social proof stats display
│   ├── BattleResult.vue     # Add cliffhanger + share buttons
│   ├── EncounterDialog.vue  # Add multi-message dialogue phase
│   ├── ShareModal.vue       # Rebrand + add "Did You Know?" card type
│   └── App.vue              # Add challenge route detection
├── (new)
│   ├── ChallengeEntry.vue   # Standalone challenge quiz (3 questions)
│   ├── DidYouKnowCard.vue   # Shareable fact card
│   ├── KnowledgeCard.vue    # Chapter completion collectible
│   └── SessionEnd.vue       # Cliffhanger + streak + summary screen
```

### Supabase Schema Additions

```sql
-- Add to existing leaderboard setup:

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_slug TEXT NOT NULL,
    anonymous_token TEXT NOT NULL,
    player_name TEXT DEFAULT 'Adventurer',
    save_data JSONB,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    captured_count INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_played_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_slug, anonymous_token)
);

CREATE TABLE answer_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_slug TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    question_index INT NOT NULL,
    total_answers INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    UNIQUE(game_slug, npc_id, question_index)
);

CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_slug TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    sender_name TEXT,
    sender_score INT,
    accepted BOOLEAN DEFAULT false,
    receiver_score INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## BUILD ORDER (2 WEEKS, CLAUDE CODE ONLY)

### Week 1: Fork + Transform Content + Playable Game

```
SESSION 1: Fork + Rebrand (2-3 hours)
├── Fork PokeLenny repo
├── Create src/constants.js with all brand strings
├── Grep + replace ALL "LennyRPG"/"Lenny"/"podcast"/"PM" references
├── Update package.json (name, description, homepage)
├── Update index.html (title, meta tags, OG image placeholder)
├── Update README.md
├── Verify game still runs: npm run dev
└── Commit: "rebrand: PokeLenny → QuestForge (Heart Quest)"

SESSION 2: Content Pipeline (3-4 hours)
├── Build scripts/generate-content.ts
│   ├── Read .md/.txt/.pdf files from content/ directory
│   ├── Chunk text (800 tokens, section-aware)
│   ├── Call Gemini 2.5 Flash with master generation prompt
│   │   (Include ALL Game Design Bible rules: narrative, cliffhangers,
│   │    surpriseFactor, didYouKnowFact, shareText, dialogue arrays)
│   ├── Output public/assets/questions.json (PokeLenny-compatible format)
│   └── Output src/game/StageConfig.js (6 chapters × 5 NPCs)
├── Create content/heart-health/ directory
├── Add lipiwiz.com heart health documents (MD/TXT files)
├── Run: npx tsx scripts/generate-content.ts
├── Verify questions.json has correct format
└── Commit: "feat: CLI content generation pipeline"

SESSION 3: Avatar Generation (1-2 hours)
├── Build scripts/generate-avatars.ts
│   ├── Read NPC names from questions.json
│   ├── Call Nano Banana Pro (gemini-3-pro-image-preview)
│   ├── Save to public/assets/avatars/{Name}_pixel_art.png
│   └── Add 2-second delay between API calls (rate limiting)
├── Delete old Lenny podcast avatars
├── Run: npx tsx scripts/generate-avatars.ts
├── Review generated avatars for consistency
└── Commit: "feat: AI-generated NPC avatars via Nano Banana Pro"

SESSION 4: Village Map (2-3 hours)
├── Modify scripts/generate-large-map.js → village theme
│   ├── Swap tileset to fantasy/village tileset (download from OpenGameArt/Kenney)
│   ├── Generate 6 zones: village center, east, west, north, mountain, temple
│   ├── Add paths between zones, trees, buildings, water features
│   ├── Same collision layer structure (Overworld.js compatible)
│   └── Output: public/assets/pokelenny-large-map.json (same filename = zero code changes)
├── Replace tuxmon tileset PNGs with village tileset PNGs
├── Run: node scripts/generate-large-map.js
├── Test in game: npm run dev → verify movement + NPC spawning works
└── Commit: "feat: village map theme replacing office"

SESSION 5: Dialogue Phase (2-3 hours)
├── Modify EncounterDialog.vue
│   ├── Read npcData.dialogue array (new field)
│   ├── Show dialogue messages one at a time (typewriter, existing effect)
│   ├── Tap/space to advance through messages
│   ├── After last dialogue message → show battle prompt
│   ├── Fallback: if no dialogue array, show original single message
│   └── Style: NPC name + avatar above dialogue box (already there)
├── Modify GuestData.js
│   ├── Pass new fields (dialogue, cliffhanger, knowledgeCard) through
│   └── No structural changes — just don't strip unknown fields
├── Test: encounter NPC → see 2-3 dialogue boxes → then battle
└── Commit: "feat: NPC dialogue phase before quiz battle"
```

### Week 2: Viral Mechanics + Save + Polish

```
SESSION 6: Social Proof in Battle (1-2 hours)
├── Modify BattleScreen.vue
│   ├── After answer reveal, show: "Only X% of players get this right"
│   ├── Read from answer_stats table (Supabase) if available
│   ├── Fallback to question.correctPct from questions.json
│   └── Style: subtle text below explanation
├── Add Supabase answer_stats table (migration SQL)
├── POST answer result to Supabase after each question
└── Commit: "feat: social proof stats on quiz answers"

SESSION 7: Post-Battle Viral Mechanics (3-4 hours)
├── Modify BattleResult.vue
│   ├── After existing XP/capture display, add:
│   │   ├── Cliffhanger text (from npcData.cliffhanger)
│   │   ├── Knowledge Card (if captured, from npcData.knowledgeCard)
│   │   ├── "Challenge a Friend" button (Web Share API + copy link)
│   │   └── Best "Did You Know?" fact from this battle (highest surpriseFactor)
│   └── Challenge URL: ?challenge={npcName}&from={playerName}&score={pct}
├── Build DidYouKnowCard.vue
│   ├── Beautiful fact card with social proof stat
│   ├── Share button (Web Share API, fallback: copy + Twitter/WhatsApp)
│   └── Pre-written shareText from questions.json
├── Modify ShareModal.vue
│   ├── Add "Did You Know?" card type alongside existing trainer card
│   ├── Rebrand existing trainer card to match game theme
│   └── Add challenge link sharing
└── Commit: "feat: cliffhangers, knowledge cards, DYK shares, challenge links"

SESSION 8: Challenge Entry Point (2-3 hours)
├── Build ChallengeEntry.vue
│   ├── Detects ?challenge= URL parameter in App.vue
│   ├── Shows: "[Sender] scored X%. Can you beat it?"
│   ├── Loads that NPC's questions from questions.json
│   ├── Runs 3-question quiz (reuse BattleScreen logic, simplified)
│   ├── Shows score comparison at end
│   ├── CTAs: "Explore Full Game" | "Challenge Back" | "Share Score"
│   └── "Explore Full Game" → loads normal game (title → overworld)
├── Modify App.vue to route ?challenge= to ChallengeEntry
├── Add OG meta tags for challenge URLs (dynamic via Vercel edge)
└── Commit: "feat: challenge link entry point (viral loop)"

SESSION 9: Persistent Save + Streak (2-3 hours)
├── Modify GameState.js
│   ├── Add syncToSupabase() after each save()
│   ├── Add loadFromSupabase() for cross-device resume
│   ├── Track streak_days (increment if last_played > 24h ago)
│   ├── Track wrong_answers (for NPC memory — which questions missed)
│   └── Keep localStorage as instant cache, Supabase as persistent backup
├── Add Supabase players table (migration SQL)
├── Add anonymous_token generation (UUID in cookie)
├── Modify title screen: show streak count + "Welcome back!" if returning
└── Commit: "feat: persistent save to Supabase + streak tracking"

SESSION 10: Session End Screen + NPC Memory (2-3 hours)
├── Build SessionEnd.vue
│   ├── Shows after exiting a building/zone or after 3+ encounters
│   ├── Summary: what you learned this session (NPC names + topics)
│   ├── Cliffhanger for next session (from last NPC's cliffhanger)
│   ├── Streak counter: "🔥 3-day streak!"
│   ├── Knowledge Cards earned this session
│   └── "Share Progress" + "Continue Playing" buttons
├── NPC Memory: modify EncounterDialog.vue
│   ├── If player has visited this NPC before (check GameState):
│   │   → Show returning greeting instead of first greeting
│   ├── If player got questions wrong last time:
│   │   → Reference it: "Last time you mixed up liver and kidneys..."
│   └── Data source: GameState.data.wrongAnswers array
└── Commit: "feat: session end screen + NPC memory for returning players"

SESSION 11: Deploy + Test (2-3 hours)
├── Run full pipeline: seed-lipiwiz.sh
│   ├── Ingest heart health documents
│   ├── Generate questions.json + StageConfig.js
│   ├── Generate NPC avatars
│   └── Generate village map
├── npm run build → verify production build
├── Deploy to Vercel
├── End-to-end test:
│   ├── Title screen → enter name → walk around village
│   ├── Encounter NPC → dialogue phase → quiz battle
│   ├── Capture NPC → cliffhanger → Knowledge Card
│   ├── Challenge friend → open link → 3-question quiz
│   ├── "Did You Know?" share → verify OG image
│   ├── Leaderboard → verify Supabase
│   ├── Close + reopen → verify save/load
│   └── Mobile test (touch controls, responsive)
├── Fix bugs found during testing
├── Update OG image for social sharing
└── Commit: "chore: deploy lipiwiz.com/play"
```

---

## ENVIRONMENT VARIABLES

```bash
# .env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GAME_SLUG=heart-quest
VITE_GAME_URL=https://lipiwiz.com/play

# CLI scripts only (not exposed to frontend)
GEMINI_API_KEY=AI...   # Embeddings + content gen + Nano Banana Pro avatars
```

---

## MASTER CLAUDE CODE COMMAND

```
I'm forking github.com/hbshih/PokeLenny (MIT licensed) to create an
educational RPG platform. Read these documents first:
1. questforge-game-design-bible.md (game design principles)
2. questforge-fork-spec.md (THIS FILE — what to change)

The base repo is a working Pokémon-style RPG with:
- Phaser 3.90 + Vue 3 + Vite
- Quiz battle system (3 questions per NPC, HP, XP, leveling)
- Overworld movement with NPC spawning
- Supabase leaderboard
- 29 progressive maps
- Full music system

I need you to transform it into an educational RPG where:
- Content comes from uploaded documents (heart health for lipiwiz.com)
- NPCs are AI-generated characters (not podcast guests)
- Map is a fantasy village (not an office)
- Avatars are generated by Nano Banana Pro
- NPC encounters have a dialogue phase BEFORE the quiz
- Every battle ends with a cliffhanger teasing the next NPC
- Surprising facts generate shareable "Did You Know?" cards
- Players can challenge friends via direct links
- Progress saves to Supabase (not just localStorage)
- NPCs remember returning players

CRITICAL RULES:
1. Create src/constants.js FIRST. Every user-visible string must be imported
   from constants. Zero hardcoded brand strings. Grep after every session.
2. questions.json format stays compatible with PokeLenny's structure.
   Add new fields (dialogue, cliffhanger, knowledgeCard, surpriseFactor)
   but never remove existing ones.
3. Don't rewrite working systems. The battle screen, overworld movement,
   music, leaderboard, and collection screen work. Modify, don't replace.
4. Follow the Game Design Bible: narrative hooks > XP, sessions are 3-5 min,
   wrong answers are more interesting than right answers, every session ends
   with a cliffhanger, walking is < 30 sec.
5. CLI scripts use Gemini API for everything: gemini-2.5-flash for content
   generation, gemini-3-pro-image-preview (Nano Banana Pro) for avatars.
   One GEMINI_API_KEY for all AI.
6. Build order follows the Fork & Customize spec: Week 1 sessions 1-5,
   Week 2 sessions 6-11.

START WITH:
1. Clone the repo
2. Create src/constants.js
3. Grep + replace all brand strings
4. Verify npm run dev still works
5. Then follow the session-by-session build order
```

---

## WHAT SUCCESS LOOKS LIKE

After 2 weeks, lipiwiz.com/play has:

- A pixel-art village where players walk around and encounter heart health NPCs
- Each NPC tells a piece of the village mystery story (2-3 dialogue boxes)
- Then challenges the player to a 3-question quiz about what they just learned
- Wrong answers show: "73% of players get this wrong too" + interesting explanation
- Capturing an NPC earns a Knowledge Card + shows a cliffhanger for the next NPC
- Surprising facts generate beautiful "Did You Know?" cards shareable on social media
- Challenge links let players dare friends to beat their score on a specific NPC
- Progress saves across sessions via Supabase
- Leaderboard shows top players
- The game runs beautifully on mobile (tap to walk, tap to answer)
- Total playtime to completion: 20-40 minutes across 6-10 sessions of 3-5 minutes

And the entire content pipeline is a single command:
```bash
./scripts/seed-lipiwiz.sh
# → Reads heart health docs
# → Generates 30 NPCs with dialogue, quizzes, cliffhangers
# → Generates 30 pixel art avatars
# → Generates village map
# → Ready to deploy
```

---

*Fork & Customize Spec — March 2026 | CORDOC LLC*
*Base: PokeLenny by Ben Shih (MIT) | Engine: Phaser 3.90 + Vue 3*
*"Don't rebuild what works. Transform what matters."*
