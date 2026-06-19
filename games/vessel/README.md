# The 50% Lie — Artery Defense (prototype)

A mobile-first, survivor-like (Vampire-Survivors style) set **inside an artery**.
Standalone Three.js game, separate from the Phaser "Lipid Wizard" app in the repo
root. This is a grey-box prototype: rough art, real loop.

## The idea

Fun first; learning is the byproduct of replay. The whole game ladders to one
sticky sentence:

> Most heart attacks strike arteries less than half blocked. It's not how blocked
> you are — it's how much you've built up, and how stable it is.

## How it plays

- **One thumb / WASD to move.** All attacks are automatic.
- You are the **Guardian (HDL)**. **LDL particles** (orange) flood in, drift to the
  wall, **oxidize**, and embed as **foam cells** — permanent plaque that damages the
  wall and **carries into your next run** (cumulative exposure, felt not read).
- Clear LDL → XP → **level up → pick 1 of 3 upgrades**, each a real mechanism:
  - **Shear Wave** (exercise) — sweeps LDL off the wall, firms the cap.
  - **HDL Escort** — an orbiter that hauls LDL away.
  - **Antioxidant** — LDL takes longer to embed.
  - **LDL Receptors** — clear faster.
  - **Statin** (Lv2+) — fewer LDL enter at the source.
- 3 short waves; each opens with a **curiosity hook** and closes with the reveal.
- If the wall fails, you get a **heart attack** — often at well under 50% narrowing,
  because the thin, inflamed cap ruptured. That fail screen *is* the lesson.

## Run it

```bash
cd games/vessel
npm install
npm run dev      # http://127.0.0.1:5188
npm run build    # typecheck + production build
```

## Map: mechanic → biology

| Mechanic | Biology |
| --- | --- |
| LDL horde | LDL particles entering the artery wall |
| Spawn rate | LDL-C / ApoB level |
| Foam-cell deposits | oxidized-LDL macrophages = plaque |
| Wall narrowing | stenosis |
| Rupture at low narrowing | vulnerable (thin-cap) plaque |
| Plaque persisting across runs | cumulative lifetime exposure |
| Upgrades | exercise, HDL, antioxidants, LDL clearance, statins |

## Status / next

Built end-to-end (move + auto-fire, waves, level-up, rupture, persistence, mobile
HUD). Next candidates: audio, real art pass, statin/meds tier depth, more vessels,
and a shareable "Did You Know" end card.
