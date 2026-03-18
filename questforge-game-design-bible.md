# QuestForge — Game Design Bible
## "Why would they tap play a second time?"

> This document is SECTION 0 of the platform spec.
> It comes before any architecture, schema, or code.
> Every engineering decision must serve these principles.

---

## THE CORE PROBLEM

A 42-year-old sits in a cardiologist's waiting room. They open lipiwiz.com
on their phone. They see a pixel art village. They play for 4 minutes.
Their name gets called.

**Will they ever open it again?**

Everything in this document exists to make the answer yes.

---

## DESIGN PRINCIPLE #1: THE UNFINISHED STORY

People don't abandon stories mid-sentence. They abandon activities.

The game is not an "activity" (quiz, lesson, exercise). The game is a
**story that happens to teach things.** The player is not "studying
cholesterol." They are helping Dr. Statina solve a mystery about why
the village is getting sick — and along the way they happen to learn
what LDL does.

### The Meta-Narrative

Every game instance has an overarching story. For lipiwiz.com:

```
THE STORY:
The Village of Heartwell is under a mysterious curse. Villagers are
falling ill one by one. Nobody knows why. You've arrived as an outsider
— and strangely, the ancient Heart Crystal chose you as the one who
can investigate. Each building in the village holds a piece of the
puzzle. The NPCs inside are experts who've each discovered part of
the answer, but they need YOUR help connecting the dots.

The real "curse" is cardiovascular disease.
The "investigation" is learning how it works and how to prevent it.
The player doesn't realize they're studying — they're solving a mystery.
```

AI generates this meta-narrative from the uploaded content:
- Input: heart disease prevention documents
- Output: a story where the educational content IS the plot

### The Per-Chapter Story Arc

Each building isn't "Chapter 3: LDL, ApoB, and Lp(a)." It's:

```
THE LAB — "The Invisible Enemy"
Professor Particle has been studying the blood samples of sick
villagers. She's found something disturbing: tiny particles she's
never seen before are clogging the village waterways (arteries).
She needs your help identifying them. But she warns you — not all
particles are what they seem. Some are harmless. Some are deadly.
And one... one is so rare and dangerous that most healers don't
even know it exists.

[This is LDL, ApoB, and Lp(a) — taught as a detective investigation]
```

### The Cliffhanger System

**CRITICAL: Every session MUST end with an unresolved thread.**

When the player completes a quest or runs out of time, the game
deliberately plants a hook:

```typescript
// After completing the Library quest
const CLIFFHANGERS = {
    afterChapter1: {
        npc: "Lipidus the Wise",
        text: `Wait — before you go. I've been studying the old
               scrolls, and I found something troubling. The sickness
               isn't just about what's IN the blood. It's about what
               the body DOES with it. The Clinic healer... she knows
               more. But she only shares her knowledge with those
               who've proven themselves. Come back when you're ready.`,
        tease: "Next: The Clinic — Dr. Panela has discovered something
               about the liver that changes everything.",
    },
    afterChapter2: {
        npc: "Dr. Panela",
        text: `Your lab results are... unexpected. These numbers tell
               a story, but not the one I expected. There's a researcher
               in the Lab — Professor Particle — who's been tracking
               something she calls "the invisible enemy." I think your
               results are connected to her findings. You need to see her.`,
        tease: "Next: The Lab — Professor Particle has found particles
               in the blood that most healers don't know exist.",
    },
    // ... one per chapter, each explicitly teasing the next
}
```

The tease appears on a "session end" screen:

```
┌──────────────────────────────────────────────┐
│                                              │
│  ⚔️ Session Complete!                        │
│                                              │
│  Today you learned:                          │
│  ✅ What cholesterol actually is              │
│  ✅ Why your body makes it                    │
│  ✅ The difference between LDL and HDL        │
│                                              │
│  📖 Story continues...                       │
│  "Dr. Panela has discovered something about  │
│   the liver that changes everything."         │
│                                              │
│  🔥 2-day streak                             │
│                                              │
│  [Continue Playing]    [Save & Exit]         │
│                                              │
└──────────────────────────────────────────────┘
```

---

## DESIGN PRINCIPLE #2: MICRO-SESSIONS (3-5 MINUTES)

The game is designed for stolen moments, not dedicated gaming time.

### Session Atoms

The smallest unit of meaningful progress is a **session atom** — one
complete interaction that takes 1-3 minutes and leaves the player
with both a reward and a hook.

Session atoms:
1. **NPC Dialogue** (1-2 min): Talk to an NPC, learn one concept,
   get a cliffhanger about what comes next. 5-8 dialogue boxes max.
2. **Quick Quiz** (2-3 min): 3-5 questions on what you just learned.
   Immediate feedback. Social proof stats. XP.
3. **Mystery Clue** (1-2 min): Find a clue in the building, get a
   hint about the bigger mystery. Makes you WANT the next session.
4. **NPC Memory Moment** (30 sec): Return to an NPC who remembers
   your last conversation and builds on it.

### Session Flow

A typical 4-minute session:

```
0:00  Open game → character appears where you left off
0:15  Walk to nearest NPC (short walk, not a maze)
0:30  NPC greets you by name, remembers last conversation
0:45  NPC dialogue begins — teaches ONE concept through story
2:00  NPC asks "Want to test what you learned?" → Quick Quiz
3:00  Quiz complete, score shown, social proof stat
3:30  NPC cliffhanger: "But wait — there's something I haven't
      told you yet. Come back and I'll explain."
4:00  Session end screen with streak counter + story tease
```

### What This Means for Map Design

The village MUST be small. Walking from the fountain to any building
should take less than 10 seconds. Interior maps should be tiny — the
NPC should be immediately visible when you enter. Zero wandering.
The walking exists to create a sense of PLACE, not to waste time.

```
Village walking distances (in seconds):
Fountain (spawn) → any building door: 5-8 seconds
Building door → NPC inside: 2-3 seconds
NPC to NPC within same building: 3-4 seconds

TOTAL walking per session: < 30 seconds
TOTAL content per session: 3-4 minutes
```

### Quick Resume

When the player returns, they should be IN the action within 10 seconds:

```
Open game → [1 sec] load → [2 sec] character appears on map
→ [3 sec] popup: "Welcome back! Dr. Panela is waiting for you
  in the Clinic. She has news about your results."
→ [5 sec] tap to auto-walk to NPC → content begins
```

No title screen on return. No "loading..." No menu navigation.
Straight to the story.

---

## DESIGN PRINCIPLE #3: NPCs THAT REMEMBER

This is the AI-native advantage that no traditional game has.

### Memory System

Every NPC tracks what the player has:
- Learned (which dialogue nodes completed)
- Gotten wrong (which quiz questions failed)
- Asked about (free chat topics)
- Expressed interest in (dialogue choices made)

This data lives in `player.variables` (RPGJS) and syncs to the
platform API.

### Memory-Powered Interactions

**Return greeting:**
```
First visit:  "Welcome, traveler! I'm Dr. Statina. I study the
               ancient art of lipid management."
Second visit: "Ah, you're back! Last time we talked about LDL
               particles. Have you been thinking about it?"
Third visit:  "My favorite student returns! You know, since we
               last spoke, I found something that connects to
               that question you asked about statins..."
```

**Wrong answer callback:**
```
Player got a quiz question about LDL wrong in session 2.
In session 3, the relevant NPC says:

"Remember when you thought LDL was produced in the kidneys?
 Don't worry — 73% of players get that wrong too. Let me show
 you WHY people confuse this. It's actually a fascinating story
 about how your body recycles cholesterol..."
```

This turns a failed quiz question into a REASON to come back.
The NPC "noticed" your mistake and prepared a mini-lesson.

**Interest tracking:**
```
Player chose dialogue option "Tell me more about genetics" in Ch 2.
In Chapter 4, the medication NPC says:

"Dr. Panela mentioned you were curious about the genetics side.
 That's actually relevant here — PCSK9 inhibitors work by
 targeting a specific gene. Want to hear how?"
```

Cross-chapter NPC references make the world feel alive and make the
player feel SEEN.

### Implementation

Each NPC's greeting and dialogue are generated with context:

```typescript
async function getNPCGreeting(
    npcId: string,
    playerMemory: PlayerMemory
): Promise<string> {
    const prompt = `
    You are ${npc.name}, a ${npc.role} in an educational RPG.
    Your persona: ${npc.persona}

    The player has visited you ${playerMemory.visitCount} times.
    Topics they've learned: ${playerMemory.completedTopics.join(', ')}
    Questions they got wrong: ${playerMemory.wrongAnswers.map(a => a.question).join('; ')}
    Their interests (from dialogue choices): ${playerMemory.interests.join(', ')}
    Cliffhanger from their last visit: ${playerMemory.lastCliffhanger}

    Generate a 2-3 sentence greeting that:
    1. Acknowledges their return (if not first visit)
    2. References something specific from their history
    3. Creates curiosity about what you'll teach them today

    Keep it warm, brief, and in character.
    `
    return await gemini.generateContent(prompt)
}
```

For MVP, this can be hybrid: pre-generated greetings for common paths,
with Gemini calls for truly personalized moments (wrong answer callbacks,
interest references).

---

## DESIGN PRINCIPLE #4: SOCIAL PROOF AS GAME MECHANIC

People don't just want to learn — they want to know how they compare.

### Real-Time Stats (After Every Quiz Question)

```
┌──────────────────────────────────────────────┐
│                                              │
│  ✅ Correct!                                  │
│                                              │
│  "LDL is produced primarily in the liver."   │
│                                              │
│  📊 Only 34% of players got this right       │
│     You're in the top 5% on this topic       │
│                                              │
│  [Next Question →]                           │
│                                              │
└──────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────┐
│                                              │
│  ❌ Not quite!                                │
│                                              │
│  You chose: "Kidneys"                        │
│  Correct: "Liver"                            │
│                                              │
│  📊 73% of players get this wrong too        │
│     Don't worry — this is one of the most    │
│     commonly confused facts in cardiology.   │
│                                              │
│  💡 Here's why it's confusing:               │
│  "The kidneys DO filter cholesterol from     │
│   blood, but they don't produce it..."       │
│                                              │
│  [Next Question →]                           │
│                                              │
└──────────────────────────────────────────────┘
```

### Why This Works

- Correct + rare = pride ("I'm in the top 5%!")
- Wrong + common = comfort ("73% got this wrong too")
- Both create stories worth sharing ("Did you know 73% of people
  don't know where cholesterol is made?")

### Aggregate Stats Per Game

Track per-question answer rates. After 100+ players, these stats
become real and valuable. Before that, seed with reasonable estimates
from the AI generation prompt:

```
"For each quiz question, also estimate the percentage of educated
 adults who would answer correctly. Use this format:
 estimated_correct_pct: 35  // This is a commonly misunderstood fact"
```

---

## DESIGN PRINCIPLE #5: THE SESSION-END REWARD

Every session must end with something tangible.

### The Knowledge Card

After each chapter (or significant quest), the player earns a
**Knowledge Card** — a beautiful, shareable summary of what they learned.

```
┌──────────────────────────────────────────────┐
│  🃏 KNOWLEDGE CARD                            │
│                                              │
│  ❤️ The Cholesterol Truth                     │
│                                              │
│  "Your body makes 80% of its cholesterol.    │
│   Only 20% comes from food. The liver is     │
│   the factory. LDL carries it OUT. HDL       │
│   carries it BACK."                          │
│                                              │
│  📊 You scored 80% on this topic             │
│  🏆 Better than 67% of adventurers           │
│                                              │
│  Earned by: [Player Name]                    │
│  lipiwiz.com/play                            │
│                                              │
│  [Share]  [Save]  [Print]                    │
│                                              │
└──────────────────────────────────────────────┘
```

These cards are:
- Collectible (visible in player profile)
- Shareable (generates an OG image for social media)
- Printable (bring to your doctor appointment)
- Progressive (collecting all 6 unlocks a "Master Card")

### The Master Report

After completing all 6 chapters, the player gets a comprehensive
**Heart Health Report Card** — a printable PDF summarizing everything
they learned, their quiz scores per topic, and personalized
recommendations based on their answers.

This is the tangible reward that connects the game to real life.
"I played this game and here's what I learned about MY risk factors."

---

## DESIGN PRINCIPLE #6: DIFFICULTY THROUGH NARRATIVE, NOT MECHANICS

Your audience is 40+ non-gamers. The game MUST be effortless to control.

### Controls

```
Desktop:  Arrow keys OR click-to-walk (click anywhere, character
          walks there automatically)
Mobile:   Tap to walk. Tap NPC to talk. Tap answer to select.
          NO virtual joystick. NO complex gestures.

Interaction: Tap/click NPC → dialogue starts
             Tap/click answer → select it
             Tap/click "Next" → advance
```

That's it. Three actions: move, talk, choose.

### No Fail States

- You can't die
- You can't get stuck
- Wrong quiz answers don't lock you out — they give better explanations
- Level gates are soft: "You're not ready yet, but try this first..."
- Every building is revisitable
- No timers on regular quizzes (only the optional boss battle)

### Auto-Guidance

If a player stands still for 15 seconds, show a subtle hint:

```
💬 "The Clinic door is open. Dr. Panela is waiting for you." [→]
```

If they've been in the village for 30 seconds without entering a
building, show the next objective:

```
📋 Current Quest: Talk to Dr. Panela in the Clinic about your
   lab results.  [Auto-walk there]
```

The [Auto-walk there] button moves the character automatically.
The walking is flavor, not a puzzle.

---

## RETENTION HOOKS: THE RETURN LOOP

### Why They Come Back (Ranked by Priority)

1. **Unfinished Story** — "What did Professor Particle find?"
   The cliffhanger from session N must be strong enough that
   the player thinks about it later.

2. **NPC Memory** — "Dr. Statina noticed I got that question wrong
   and is going to explain it." The promise of personalized follow-up.

3. **Streak** — "I have a 3-day streak, don't want to break it."
   Simple but effective. Show it prominently on the session end screen.

4. **Social Proof Gap** — "I scored lower than average on Chapter 3.
   I want to redo it." Loss aversion kicks in.

5. **Knowledge Cards** — "I have 4 of 6 cards. I want the full set."
   Collection completionism.

6. **Master Report** — "If I finish, I get a report I can show my
   doctor." Real-world value at the end.

### Notification Strategy (Optional, Post-MVP)

If the player provided an email (at the level 3 gate):

- Day 1 after last session: "Dr. Panela just got your results back.
  She says it's urgent." (Story hook, not marketing speak)
- Day 3: "You have a 3-day streak. Lipidus the Wise is impressed."
- Day 7: "Professor Particle made a breakthrough about those particles
  in your blood. She needs to talk to you." (Cliffhanger reminder)
- After completion: "Your Heart Health Report Card is ready. Print it
  before your next appointment."

These emails are IN CHARACTER — from the NPCs, not from the platform.
That's a massive differentiation from typical reminder spam.

---

## WHAT "COMPLETION" MEANS

### For the Player

Completion = all 6 Knowledge Cards + Master Report.
This should take 6-10 sessions of 3-5 minutes each.
Total time investment: 20-40 minutes spread across 1-2 weeks.

### For the Creator (Business Metric)

Track these:
- **Session 1 completion**: Did they finish at least one quest atom?
- **Return rate**: Did they come back within 7 days?
- **Chapter completion**: Which chapters see drop-off?
- **Quiz engagement**: Are they answering all questions or skipping?
- **Email capture rate**: What % give email at the level gate?
- **Full completion**: What % earn all 6 Knowledge Cards?
- **Share rate**: What % share a Knowledge Card?
- **Report generation**: What % generate the Master Report?

### Target Benchmarks (Aspirational)

- Session 1 completion: >80% (it's only 3-4 minutes)
- Return rate (D7): >30% (industry average for mobile games is 10-15%)
- Full completion: >15% (most educational content sees <5%)
- Email capture: >25%

---

## AI GENERATION INSTRUCTIONS

When AI generates game content from uploaded documents, it MUST
follow these narrative principles. Include this in the master
generation prompt:

```
NARRATIVE RULES FOR CONTENT GENERATION:

1. STORY FIRST: Every chapter must have a mini-mystery or question
   that the player is "investigating." Educational content is
   evidence/clues the player discovers, NOT lessons being taught.

2. CLIFFHANGERS: Every chapter's dialogue tree MUST end with an
   unresolved question that explicitly teases the next chapter.
   The player should think "wait, I need to know what happens next."

3. NPC PERSONALITY: Each NPC must have a distinct personality and
   speaking style. They are CHARACTERS, not textbooks. They have
   opinions, they make jokes, they express concern for the player.

4. WRONG ANSWER DESIGN: For every quiz question, the incorrect
   options must be PLAUSIBLE and the explanations must be
   INTERESTING. "73% of people get this wrong because..." is more
   engaging than "The correct answer is B."

5. CROSS-REFERENCES: NPCs must reference each other. Chapter 3's
   NPC should say "Dr. Panela in the Clinic mentioned this to you."
   The world must feel interconnected, not siloed.

6. BREVITY: No dialogue node should exceed 3 sentences. Players
   are tapping through on a phone. Short, punchy, one idea per box.

7. EMOTIONAL STAKES: The meta-narrative must make the player feel
   like their learning MATTERS to the story. "The village needs you
   to understand this." Not "here is a fact about cholesterol."

8. SESSION ATOMS: Every quest must be completable in 2-3 minutes.
   No quest should require more than one session. Players must feel
   a sense of accomplishment every time they play.
```

---

## ONE-PAGE SUMMARY FOR SUBAGENTS

When handing this to Claude Code or any building agent, include:

```
GAME DESIGN PRIORITIES (in order):

1. Narrative hooks > XP/levels. The story is the retention engine.
2. Sessions are 3-5 minutes. Every quest is one session atom.
3. NPCs remember the player. Greetings reference past interactions.
4. Wrong answers are more interesting than right answers.
5. Every session ends with a cliffhanger + "what's next" tease.
6. Walking is flavor (< 30 sec/session), not gameplay.
7. Social proof on every quiz answer ("X% got this wrong").
8. Zero fail states. You can't die, get stuck, or be punished.
9. Tap to walk, tap to talk, tap to choose. Three actions total.
10. The game is a mystery to solve, not a course to complete.
11. Every share moment makes the SHARER look smart, not the game.
12. Challenge-a-friend is the primary viral loop.
```

---

## DESIGN PRINCIPLE #7: VIRAL LOOPS — MAKE THEM LOOK SMART

People don't share games. They share **moments that make them look
interesting.** The viral trigger in educational content is never "look
at my score." It's the surprising fact that makes them say to a friend:
"Did you know 80% of your cholesterol isn't from food? Your liver makes it."

Every share mechanic must pass the **Dinner Party Test:**
Would someone bring this up at dinner? If yes, it's shareable.
If it's just a score, it's not.

### The Three Viral Loops

```
LOOP 1: "Did You Know?" Moments → Social Shares
Trigger: Player learns a surprising fact during gameplay
Action: Game generates a shareable card with the fact
Share: Player posts to social media / sends to friend
Return: Friend sees card → "Play Heart Quest" link → new player

LOOP 2: Challenge a Friend → Direct Invites
Trigger: Player captures an NPC or completes a chapter
Action: "Challenge a friend to beat your score on this NPC"
Share: Sends a direct link to a specific NPC encounter
Return: Friend plays that ONE encounter → hooked → plays more

LOOP 3: Knowledge Card Collection → Status Sharing
Trigger: Player earns all cards in a chapter
Action: Beautiful completion card generated
Share: "I completed the Cholesterol chapter — test yourself!"
Return: Social proof of completion → friends want to try
```

### Loop 1: "Did You Know?" Moments

After EVERY quiz question — right or wrong — if the fact is surprising,
show a **Share This Fact** option. Not a button they have to look for.
A prominent, beautiful card that appears naturally.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  💡 DID YOU KNOW?                                │
│                                                  │
│  "Your body produces 80% of its cholesterol.     │
│   Only 20% comes from food."                     │
│                                                  │
│  📊 Only 23% of people knew this.                │
│                                                  │
│  ┌────────────────┐  ┌───────────────────────┐   │
│  │ 📱 Share Fact  │  │  Continue Playing →   │   │
│  └────────────────┘  └───────────────────────┘   │
│                                                  │
│  Heart Quest — lipiwiz.com/play                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Rules for "Did You Know?" cards:**
- Not every question gets one. Only genuinely surprising facts.
- AI generates a `surpriseFactor` score (1-10) for each question during
  content generation. Only facts scoring ≥ 7 get the share card.
- The share card is a generated OG image (Nano Banana Pro or HTML→PNG)
  that looks good on Twitter/LinkedIn/iMessage/WhatsApp.
- The card always includes the game URL but frames it as the FACT,
  not as "play my game."
- Share text is pre-written to make the sharer look smart:
  "TIL your liver makes 80% of your cholesterol. Food is only 20%.
   I learned this playing Heart Quest → lipiwiz.com/play"

**Implementation:**

```typescript
// In GameContent JSON, each quiz question has:
interface QuizQuestion {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
    correctPct: number
    // NEW: Viral mechanics
    surpriseFactor: number        // 1-10, AI-estimated
    didYouKnowFact?: string       // Short, punchy, shareable version
    shareText?: string            // Pre-written share copy
}
```

### Loop 2: Challenge a Friend

This is the **highest-converting viral loop** in games. Not "share your
progress" — but "I dare you to try this specific thing."

**When it triggers:**
- After capturing an NPC: "Think your friends know this topic? Challenge them."
- After getting a perfect score: "Only 12% get all 3 right. Send this to someone."
- After completing a chapter: "I beat the Cholesterol chapter. Can you?"

**How it works:**

```
Player completes NPC encounter → shown result screen

┌──────────────────────────────────────────────────┐
│                                                  │
│  🏆 Professor Particle — CAPTURED!               │
│     Score: 100% (Perfect!)                       │
│     Only 8% of players ace this encounter.       │
│                                                  │
│  ⚔️ CHALLENGE A FRIEND                           │
│                                                  │
│  "Think you know about LDL particles?            │
│   I just aced Professor Particle's quiz.         │
│   Beat my score."                                │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ 📲 Send Link │  │  Continue Playing →      │  │
│  └──────────────┘  └──────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**The challenge link structure:**

```
lipiwiz.com/play/heart-quest?challenge=npc-professor-particle&from=HeartWarrior&score=100

When a friend opens this link:
→ Game loads directly to that NPC encounter (skip walking)
→ Shows: "HeartWarrior scored 100% against Professor Particle. Can you beat it?"
→ Friend plays the 3-question quiz immediately (no account needed)
→ After: "Want to explore the full village? Keep playing."
→ Friend is now IN the game and can continue from the village
```

This is critical: **the challenge link is a ZERO-FRICTION entry point.**
The friend doesn't need an account, doesn't need to walk around, doesn't
need to understand RPG mechanics. They get three questions. They're hooked.
Then they discover the village.

**The challenge link is also the game's best SEO/sharing asset.** Each NPC
encounter becomes a standalone shareable page with its own OG image:
"Can you beat Professor Particle's quiz on LDL particles?"

### Loop 3: Knowledge Card Collection → Status Sharing

Knowledge Cards aren't just collectibles. They're **social proof of expertise.**

**After completing each chapter:**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  🃏 KNOWLEDGE CARD EARNED                        │
│                                                  │
│  ❤️ "The Cholesterol Truth"                       │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │
│  │  [Beautiful pixel art card illustration]  │    │
│  │                                          │    │
│  │  "Your body makes 80% of its             │    │
│  │   cholesterol. LDL carries it out.       │    │
│  │   HDL carries it back. The ratio         │    │
│  │   matters more than the total."          │    │
│  │                                          │    │
│  │  📊 You scored better than 78%           │    │
│  │     of adventurers on this topic.        │    │
│  │                                          │    │
│  │  Heart Quest — lipiwiz.com/play          │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Card 2 of 6 collected                          │
│                                                  │
│  ┌──────────┐ ┌────────┐ ┌──────────────────┐   │
│  │ 📱 Share │ │ 🖨 Print│ │ Continue Playing │   │
│  └──────────┘ └────────┘ └──────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

**The Knowledge Card serves three purposes:**
1. **Retention**: "I have 3 of 6 cards — I want the full set."
2. **Sharing**: Beautiful card image for social media.
3. **Real-world value**: Printable. Bring to doctor appointment.

**The completion share is the most viral moment:**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  🏆 ALL 6 KNOWLEDGE CARDS COLLECTED!             │
│                                                  │
│  [Grid of all 6 beautiful cards]                 │
│                                                  │
│  "I completed Heart Quest and became a           │
│   Heart Health Master. Test yourself →"           │
│                                                  │
│  📊 Top 3% of all players                        │
│  ⏱ Completed in 8 sessions over 12 days          │
│  🎯 Overall accuracy: 87%                        │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │      📱 Share Your Achievement           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │   🖨 Download Heart Health Report Card   │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## DESIGN PRINCIPLE #8: SHARE MOMENTS ARE DESIGNED, NOT ADDED

Every shareable moment must be:
1. **Visually beautiful** — generates an OG image that looks good in feeds
2. **Self-contained** — the card makes sense without context
3. **Makes the sharer look smart** — not "I played a game" but "I know this"
4. **Includes a hook for the viewer** — fact, challenge, or question
5. **Has a clear CTA** — link to play, not just link to site

### Share Image Generation

Each share moment generates a beautiful image using Nano Banana Pro or
server-side HTML → PNG rendering:

```typescript
// API route: /api/play/[slug]/share-image
// Generates OG image for:
// - "Did You Know?" facts
// - Challenge links (NPC encounter cards)
// - Knowledge Cards (chapter completion)
// - Final completion certificate
// - Leaderboard position

interface ShareImageRequest {
    type: 'fact' | 'challenge' | 'knowledge-card' | 'completion' | 'leaderboard'
    data: {
        // Type-specific data
        fact?: string
        npcName?: string
        npcAvatar?: string
        score?: number
        playerName?: string
        percentile?: number
        cardTitle?: string
        cardContent?: string
    }
}
```

### Share Destinations

Support native share on mobile (Web Share API) and fallback buttons:

```typescript
async function shareContent(shareData: ShareData) {
    // Mobile: use native share sheet
    if (navigator.share) {
        await navigator.share({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url,
        })
        return
    }
    // Desktop: show share buttons
    // Twitter/X, LinkedIn, WhatsApp, Copy Link
    showShareModal(shareData)
}
```

### Pre-Written Share Copy (AI-Generated Per Question)

The AI content generation prompt must generate share-ready copy:

```
For each quiz question with surpriseFactor ≥ 7, also generate:
- didYouKnowFact: A punchy 1-2 sentence "TIL" version of the fact
- shareText: Pre-written social post text that makes the sharer look
  knowledgeable, NOT like they're promoting a game.

GOOD share text: "TIL your liver produces 80% of your body's cholesterol.
Diet only accounts for 20%. Mind = blown. 🧠"

BAD share text: "I just played Heart Quest and learned about cholesterol!
Try it out!"

The share text must pass the Dinner Party Test: would someone say this
at dinner to sound interesting?
```

---

## DESIGN PRINCIPLE #9: THE CHALLENGE LINK IS THE GROWTH ENGINE

The single most important viral mechanic. Everything else supports this.

### Why Challenges Work

- **Zero friction**: No account, no download, no walkthrough. Three questions.
- **Competitive**: "Beat my score" triggers loss aversion.
- **Social**: Sent directly to a specific person (DM, text, WhatsApp).
- **Convertible**: After 3 questions, the person is IN the game.

### Challenge Flow (Detailed)

```
SENDER SIDE:
Player captures NPC → "Challenge a friend" button
→ Generate challenge URL with encoded: npcId, senderName, senderScore
→ Native share sheet (or copy link)

RECEIVER SIDE:
Opens link → /play/heart-quest?challenge=npc-id&from=Name&score=100
→ Splash: "[Name] scored 100% on Professor Particle's quiz. Can you beat it?"
→ Shows NPC avatar + name + topic hint
→ "Accept Challenge" button
→ Goes DIRECTLY to quiz (3 questions, no walking, no dialogue)
→ After quiz: shows score comparison
   "You: 67% vs HeartWarrior: 100%"
→ "Want revenge? Explore the village and get smarter."
→ [Start Full Game] → drops them in the village as a new player
→ [Challenge Back] → sends a counter-challenge
→ [Share My Score] → posts their own result
```

### Challenge as Distribution Channel

Each challenged friend who plays becomes a node in the viral graph:

```
Player A captures NPC → challenges Player B
Player B plays, captures NPC → challenges Player C
Player C plays, captures NPC → challenges Player D

One player can generate 3-5 challenges over a full playthrough.
If 30% of challenged people play, and 30% of THOSE challenge someone:
100 players → 30-50 challenges → 9-15 new players → 3-5 more challenges
                                                            ↓
                                              Self-sustaining at ~40% accept rate
```

### Challenge Analytics (Track Everything)

```typescript
// Track in game_events table:
{
    event_type: 'challenge_sent',
    event_data: {
        sender_id: 'player-uuid',
        npc_id: 'npc-professor-particle',
        sender_score: 100,
        channel: 'whatsapp' | 'twitter' | 'copy_link' | 'native_share'
    }
}
{
    event_type: 'challenge_accepted',
    event_data: {
        challenge_id: 'challenge-uuid',
        receiver_score: 67,
        converted_to_full_game: true
    }
}
```

---

## DESIGN PRINCIPLE #10: EMOTIONAL PEAKS CREATE SHARE MOMENTS

People share at emotional peaks, not at arbitrary UI prompts. Design the
game to CREATE those peaks, then offer sharing at exactly the right moment.

### The Peak Moments (In Order of Emotional Intensity)

```
1. "Holy sh*t, I didn't know that" (surprise)
   → "Did You Know?" share card
   → Trigger: quiz explanation reveals counterintuitive fact

2. "I'm smarter than 92% of people" (pride)
   → Stats share card
   → Trigger: quiz score with high percentile

3. "I got a perfect score!" (achievement)
   → NPC capture card + challenge link
   → Trigger: 100% on an encounter

4. "I finally understand this" (clarity)
   → Knowledge Card
   → Trigger: chapter completion

5. "I beat the final boss!" (triumph)
   → Completion certificate + Master Report
   → Trigger: all 6 chapters done

6. "I'm #3 on the leaderboard" (status)
   → Leaderboard position card
   → Trigger: top 10 ranking
```

For EACH peak moment, the share UI appears naturally in the flow —
never as a popup, never interrupting gameplay, always as part of the
result/reward screen the player is already looking at.

### Timing Rule

Show share option for exactly 5 seconds with a gentle pulse animation.
If they don't tap it, it fades to a smaller icon in the corner.
Never force it. Never repeat it. The moment passes, and a new one
will come.

---

## DESIGN PRINCIPLE #11: THE WAITING ROOM MULTIPLIER

Your first deployment is in a medical context. People in waiting rooms
talk to each other. The game should facilitate this.

### "Play Together" Mode (Not Multiplayer — Just Side by Side)

```
"I'm playing this heart health game on the doctor's website.
 It's actually really good. Here, try beating my score on
 this one question about cholesterol."
 → Hands phone (or sends challenge link via AirDrop/text)
```

The challenge link makes this effortless. But also:

### QR Code in Waiting Room

The game generates a QR code that the practice can print and display:

```
┌────────────────────────────────┐
│                                │
│   Learn about your heart       │
│   health while you wait!       │
│                                │
│        [QR CODE]               │
│                                │
│   lipiwiz.com/play             │
│                                │
│   "Can you beat the quiz?"     │
│                                │
└────────────────────────────────┘
```

This is a **physical viral loop** — every patient who walks into the
office sees the QR code. The doctor doesn't have to do anything.

### "Ask Your Doctor" Integration

After the Master Report is generated (all 6 chapters complete):

```
"Print this report and discuss with your doctor at your next visit.
 It summarizes what you've learned and flags topics you may want
 to discuss about YOUR health."
```

This creates a **conversation between patient and doctor about the
game**, which leads to the doctor recommending it to OTHER patients.
Doctor-to-patient recommendation is the highest-trust viral channel
in healthcare.

---

## UPDATED ONE-PAGE SUMMARY FOR SUBAGENTS

```
GAME DESIGN PRIORITIES (in order):

1. Narrative hooks > XP/levels. The story is the retention engine.
2. Sessions are 3-5 minutes. Every quest is one session atom.
3. NPCs remember the player. Greetings reference past interactions.
4. Wrong answers are more interesting than right answers.
5. Every session ends with a cliffhanger + "what's next" tease.
6. Walking is flavor (< 30 sec/session), not gameplay.
7. Social proof on every quiz answer ("X% got this wrong").
8. Zero fail states. You can't die, get stuck, or be punished.
9. Tap to walk, tap to talk, tap to choose. Three actions total.
10. The game is a mystery to solve, not a course to complete.
11. Every share moment makes the SHARER look smart, not the game.
12. Challenge-a-friend is the #1 viral loop. Zero friction entry.
13. "Did You Know?" cards are the #1 social share mechanic.
14. Knowledge Cards are collectible, shareable, and printable.
15. Challenge links are standalone playable pages (3 questions, no account).

VIRAL MECHANICS TO BUILD:
- "Did You Know?" share cards after surprising quiz facts
- Challenge links: /play/[slug]?challenge=npc-id&from=Name&score=X
- Knowledge Card images (chapter completion, shareable)
- Completion certificate (all 6 chapters, printable PDF)
- Leaderboard position sharing
- QR code generator for physical spaces (waiting rooms)
- Pre-written share copy that passes the Dinner Party Test
- Web Share API for native mobile sharing
- OG images for every shareable moment
```

---

*Game Design Bible v2 — March 2026 | CORDOC LLC*
*"They came for the story. They stayed for the answers. They shared the facts."*
