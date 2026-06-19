import * as THREE from 'three';
import { InputController } from '../core/InputController';
import { Loop } from '../core/Loop';
import { createRenderer, resizeRenderer } from '../core/Renderer';
import { CameraRig } from '../systems/CameraRig';
import { Guardian } from '../entities/Guardian';
import { Vessel } from '../systems/Vessel';
import { Enemies } from '../systems/Enemies';
import { Weapons } from '../systems/Weapons';
import { GameHud } from '../systems/GameHud';
import { Overlays, type EndSummary } from '../systems/Overlays';
import { RUN, UPGRADES, WAVE_BEATS, STICKY_FACT, type UpgradeCard } from './content';
import { createRunStats, recomputeDials, type RunStats } from './types';
import { loadArtery, saveArtery, resetArtery, type ArteryState } from './storage';

type Mode = 'playing' | 'levelup' | 'over';
type WavePhase = 'intro' | 'active' | 'reveal';

const FOAM_TO_PERCENT = 1.5;

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 90);
  private readonly input: InputController;
  private readonly cameraRig = new CameraRig(this.camera, new THREE.Vector3(0, 17, 6));
  private readonly vessel: Vessel;
  private readonly guardian = new Guardian();
  private readonly enemies: Enemies;
  private readonly weapons: Weapons;
  private readonly hud = new GameHud();
  private readonly overlays = new Overlays();
  private readonly loop = new Loop(
    (delta, elapsed) => this.update(delta, elapsed),
    () => this.renderer.render(this.scene, this.camera),
  );

  private artery: ArteryState;
  private stats: RunStats;
  private mode: Mode = 'playing';
  private wavePhase: WavePhase = 'intro';
  private waveIndex = 0;
  private phaseTime = 0;
  private waveRemaining: number = RUN.waveSeconds;
  private frame = 0;
  private elapsed = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);

    const stick = this.getElement('#touch-stick');
    const knob = this.getElement('#touch-knob');
    const dash = this.getElement('#dash-button');
    this.input = new InputController(stick, knob, dash);

    this.vessel = new Vessel(this.scene);
    this.scene.add(this.guardian.group);
    this.enemies = new Enemies(this.scene, this.vessel, () => this.onClear(), () => this.onEmbed());
    this.weapons = new Weapons(this.scene, this.guardian, this.enemies);

    this.artery = loadArtery();
    this.stats = createRunStats(this.artery.plaque);

    this.cameraRig.snapTo(this.guardian.group.position);
    resizeRenderer(this.renderer, this.camera);
    this.beginRun();
    this.publishDiagnostics();
  }

  start(): void {
    this.loop.start();
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.enemies.dispose();
    this.weapons.dispose();
    this.guardian.dispose();
    this.renderer.dispose();
    window.__THREE_GAME_DIAGNOSTICS__ = undefined;
  }

  private beginRun(): void {
    this.stats = createRunStats(this.artery.plaque);
    this.enemies.reset();
    this.weapons.reset();
    this.guardian.group.position.set(0, 0.9, 0);
    this.waveIndex = 0;
    this.mode = 'playing';
    this.overlays.setRunHeader(`Artery · run ${this.artery.runs + 1} · lifetime plaque ${Math.round(this.artery.plaque)}%`);
    this.enterPhase('intro');
  }

  private update(delta: number, elapsed: number): void {
    this.frame += 1;
    resizeRenderer(this.renderer, this.camera);
    this.vessel.update(delta);

    if (this.mode === 'playing') {
      this.elapsed += delta;
      this.guardian.update(delta, elapsed, this.input, RUN.arena);
      this.enemies.update(delta, this.stats);
      this.weapons.update(delta, this.stats);
      this.advanceWaves(delta);

      const narrowing = this.currentNarrowing();
      this.vessel.setNarrowing(narrowing / 100);
      this.vessel.setInflammation(this.stats.inflammation / 100);

      if (this.stats.wallIntegrity <= 0) {
        this.resolveRun(true);
      } else if (this.stats.xp >= this.stats.xpToNext) {
        this.openLevelUp();
      }

      this.hud.update(this.stats, Math.round(narrowing), this.waveLabel(), this.waveRemaining);
    }

    this.cameraRig.update(delta, this.guardian.group.position, 0.18);
    this.publishDiagnostics();
  }

  private advanceWaves(delta: number): void {
    this.phaseTime += delta;
    if (this.wavePhase === 'intro') {
      if (this.phaseTime >= 1.6) this.enterPhase('active');
    } else if (this.wavePhase === 'active') {
      this.waveRemaining = RUN.waveSeconds - this.phaseTime;
      if (this.phaseTime >= RUN.waveSeconds) this.enterPhase('reveal');
    } else {
      if (this.phaseTime >= 2.6) {
        this.waveIndex += 1;
        if (this.waveIndex >= RUN.waveCount) this.resolveRun(false);
        else this.enterPhase('intro');
      }
    }
  }

  private enterPhase(phase: WavePhase): void {
    this.wavePhase = phase;
    this.phaseTime = 0;
    const beat = WAVE_BEATS[Math.min(this.waveIndex, WAVE_BEATS.length - 1)];
    if (phase === 'intro') {
      this.enemies.spawnEnabled = false;
      this.overlays.toast(beat.hook, 'hook');
    } else if (phase === 'active') {
      this.enemies.spawnEnabled = true;
      this.waveRemaining = RUN.waveSeconds;
    } else {
      this.enemies.spawnEnabled = false;
      this.overlays.toast(beat.reveal, 'reveal');
    }
  }

  private onClear(): void {
    this.stats.ldlCleared += 1;
    this.stats.xp += 1;
  }

  private onEmbed(): void {
    if (this.stats.wallIntegrity < 35) {
      this.overlays.toast('Vulnerable plaque — the cap is thinning.', 'info', 2600);
    }
  }

  private openLevelUp(): void {
    this.mode = 'levelup';
    this.enemies.spawnEnabled = false;
    const eligible = UPGRADES.filter((card) => card.minLevel <= this.stats.level);
    const cards = this.pickThree(eligible);
    this.overlays.showLevelUp(this.stats.level + 1, cards, (card) => this.applyUpgrade(card));
  }

  private applyUpgrade(card: UpgradeCard): void {
    this.stats.upgrades[card.id] += 1;
    this.stats.xp -= this.stats.xpToNext;
    this.stats.level += 1;
    this.stats.xpToNext = Math.ceil(this.stats.xpToNext * 1.5 + 2);
    recomputeDials(this.stats, this.artery.plaque);
    this.mode = 'playing';
    if (this.wavePhase === 'active') this.enemies.spawnEnabled = true;
  }

  private resolveRun(ruptured: boolean): void {
    this.mode = 'over';
    this.enemies.spawnEnabled = false;

    const narrowing = Math.round(this.currentNarrowing());
    const lateRupture = !ruptured && this.stats.capStability < 32 && this.stats.inflammation > 62;
    const didRupture = ruptured || lateRupture;

    // cumulative exposure: plaque you let embed carries into the next run
    this.artery = {
      plaque: Math.min(100, this.artery.plaque + this.stats.foamEmbedded * FOAM_TO_PERCENT),
      runs: this.artery.runs + 1,
    };
    saveArtery(this.artery);

    const summary: EndSummary = didRupture
      ? {
          won: false,
          ruptured: true,
          narrowingPercent: narrowing,
          foamEmbedded: this.stats.foamEmbedded,
          ldlCleared: this.stats.ldlCleared,
          headline: 'Heart attack.',
          detail: `Your artery was only ${narrowing}% narrowed — but a thin, inflamed cap ruptured and clotted.`,
          stickyFact: STICKY_FACT,
        }
      : {
          won: true,
          ruptured: false,
          narrowingPercent: narrowing,
          foamEmbedded: this.stats.foamEmbedded,
          ldlCleared: this.stats.ldlCleared,
          headline: 'You held the line.',
          detail: `Stable cap, calm wall. The ${this.stats.foamEmbedded} foam cells that got through carry into your next run.`,
          stickyFact: STICKY_FACT,
        };

    this.overlays.showEnd(
      summary,
      () => this.beginRun(),
      () => {
        this.artery = resetArtery();
        this.beginRun();
      },
    );
  }

  private currentNarrowing(): number {
    return Math.min(100, this.artery.plaque + this.stats.foamEmbedded * FOAM_TO_PERCENT);
  }

  private waveLabel(): string {
    return `Wave ${Math.min(this.waveIndex + 1, RUN.waveCount)}/${RUN.waveCount}`;
  }

  private pickThree(pool: UpgradeCard[]): UpgradeCard[] {
    const copy = [...pool];
    const out: UpgradeCard[] = [];
    while (out.length < 3 && copy.length > 0) {
      const index = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(index, 1)[0]);
    }
    return out;
  }

  private publishDiagnostics(): void {
    const info = this.renderer.info;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: this.frame,
      elapsed: this.elapsed,
      score: this.stats.ldlCleared,
      targetScore: this.stats.foamEmbedded,
      complete: this.mode === 'over',
      player: {
        position: {
          x: this.guardian.group.position.x,
          y: this.guardian.group.position.y,
          z: this.guardian.group.position.z,
        },
        speed: this.guardian.velocity.length(),
      },
      renderer: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      canvas: {
        clientWidth: this.canvas.clientWidth,
        clientHeight: this.canvas.clientHeight,
        width: this.canvas.width,
        height: this.canvas.height,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      },
    };
  }

  private getElement(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }
}
