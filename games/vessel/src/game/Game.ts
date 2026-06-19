import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { InputController } from '../core/InputController';
import { Loop } from '../core/Loop';
import { createRenderer, resizeRenderer } from '../core/Renderer';
import { CameraRig } from '../systems/CameraRig';
import { Guardian } from '../entities/Guardian';
import { Vessel } from '../systems/Vessel';
import { Enemies, type Variant } from '../systems/Enemies';
import { Weapons } from '../systems/Weapons';
import { GameHud } from '../systems/GameHud';
import { Overlays, type EndSummary, type ChoiceCard } from '../systems/Overlays';
import { PostFx } from '../systems/PostFx';
import { Vfx } from '../systems/Vfx';
import { Sfx } from '../systems/Sfx';
import { Pickups } from '../systems/Pickups';
import { RUN, UPGRADES, WAVE_BEATS, STICKY_FACT, type UpgradeId } from './content';
import { createRunStats, recomputeDials, type RunStats } from './types';
import { loadArtery, saveArtery, resetArtery, type ArteryState } from './storage';

type Mode = 'playing' | 'levelup' | 'over';
type WavePhase = 'intro' | 'active' | 'reveal';
type EndReason = 'wall' | 'bossTimeout' | 'win';

const FOAM_TO_PERCENT = 1.5;
const COMBO_WINDOW = 2.0;
const BOSS_TIME = 70;

const EVOLUTIONS = [
  { id: 'cyclone', title: 'Reverse-Transport Cyclone', mechanism: 'Shear + HDL', blurb: 'A sweeping ring clears and stabilises.', needs: ['shear', 'hdl'] as UpgradeId[] },
  { id: 'macrophage', title: 'Macrophage Patrol', mechanism: 'Antiox + Clearance', blurb: 'An autonomous hunter chases LDL down.', needs: ['antioxidant', 'clearance'] as UpgradeId[] },
  { id: 'surge', title: 'Statin Surge', mechanism: 'Statin mastery', blurb: 'A vessel-wide nova every few seconds.', needs: ['statin'] as UpgradeId[] },
] as const;

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
  private readonly vfx: Vfx;
  private readonly sfx = new Sfx();
  private readonly pickups: Pickups;
  private postfx!: PostFx;
  private readonly drawBuffer = new THREE.Vector2();
  private lastDelta = 0;
  private readonly loop = new Loop(
    (delta, elapsed) => this.update(delta, elapsed),
    () => this.postfx.render(this.lastDelta),
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

  private readonly waveSeconds: number;
  private readonly bossTime: number;
  private readonly startWave: number;
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private hitStop = 0;
  private beatAccum = 0;
  private lastBeat = 0;

  // perf readout
  private fps = 60;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private sceneCalls = 0;
  private sceneTris = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    // ?fast shortens waves for quick QA of the boss + end states
    const fast = typeof location !== 'undefined' && location.search.includes('fast');
    this.waveSeconds = fast ? 6 : RUN.waveSeconds;
    this.bossTime = fast ? 14 : BOSS_TIME;
    this.startWave = typeof location !== 'undefined' && location.search.includes('boss') ? RUN.waveCount - 1 : 0;
    this.waveRemaining = this.waveSeconds;

    this.renderer = createRenderer(canvas);
    this.renderer.toneMappingExposure = 0.92;

    const stick = this.getElement('#touch-stick');
    const knob = this.getElement('#touch-knob');
    const dash = this.getElement('#dash-button');
    this.input = new InputController(stick, knob, dash);

    // image-based lighting for wet, believable speculars (baked once)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.4; // speculars only, not a brightness wash
    pmrem.dispose();

    this.vessel = new Vessel(this.scene);
    this.scene.add(this.guardian.group);
    this.vfx = new Vfx(this.scene);
    this.pickups = new Pickups(
      this.scene,
      this.guardian,
      (value, pos) => this.onGem(value, pos),
      (pos) => this.onChest(pos),
    );
    this.enemies = new Enemies(
      this.scene,
      this.vessel,
      (pos, gemValue, variant) => this.onKill(pos, gemValue, variant),
      (pos) => this.onEmbed(pos),
      (pos) => this.onBossDefeat(pos),
    );
    this.weapons = new Weapons(this.scene, this.guardian, this.enemies, (pos) => this.onSurge(pos));

    this.artery = loadArtery();
    this.stats = createRunStats(this.artery.plaque);

    this.cameraRig.snapTo(this.guardian.group.position);
    resizeRenderer(this.renderer, this.camera);
    this.renderer.getDrawingBufferSize(this.drawBuffer);
    this.postfx = new PostFx(this.renderer, this.scene, this.camera, this.drawBuffer);

    this.wireAudioAndUi();
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
    this.pickups.dispose();
    this.vfx.dispose();
    this.vessel.dispose();
    this.guardian.dispose();
    this.renderer.dispose();
    window.__THREE_GAME_DIAGNOSTICS__ = undefined;
  }

  private wireAudioAndUi(): void {
    const resume = () => {
      this.sfx.resume();
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);

    const mute = document.querySelector<HTMLButtonElement>('#mute-btn');
    mute?.addEventListener('click', () => {
      const muted = this.sfx.toggleMute();
      mute.textContent = muted ? '🔇' : '♪';
    });
  }

  private beginRun(): void {
    this.stats = createRunStats(this.artery.plaque);
    this.enemies.reset();
    this.weapons.reset();
    this.pickups.reset();
    this.guardian.group.position.set(0, 0.9, 0);
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hitStop = 0;
    this.waveIndex = this.startWave;
    this.mode = 'playing';
    this.hud.setBoss(false, 0);
    this.hud.setCombo(0);
    this.overlays.setRunHeader(`Artery · run ${this.artery.runs + 1} · lifetime plaque ${Math.round(this.artery.plaque)}%`);
    this.enterPhase('intro');
    // ?lvl forces the level-up card open for QA; ?evo also pre-stacks a synergy
    if (typeof location !== 'undefined' && location.search.includes('evo')) {
      this.stats.upgrades.shear = 3;
      this.stats.upgrades.hdl = 3;
    }
    if (typeof location !== 'undefined' && location.search.includes('lvl')) {
      this.stats.xp = this.stats.xpToNext;
    }
  }

  private update(delta: number, elapsed: number): void {
    this.frame += 1;
    this.lastDelta = delta;
    if (resizeRenderer(this.renderer, this.camera)) {
      this.renderer.getDrawingBufferSize(this.drawBuffer);
      this.postfx.setSize(this.drawBuffer.x, this.drawBuffer.y);
    }

    const frozen = this.hitStop > 0;
    if (frozen) this.hitStop -= delta;

    this.vessel.update(delta);
    this.vfx.update(delta);
    this.updateHeartbeat(delta);

    if (this.mode === 'playing' && !frozen) {
      this.elapsed += delta;
      this.guardian.update(delta, elapsed, this.input, RUN.arena);
      this.enemies.update(delta, this.stats);
      this.weapons.update(delta, this.stats);
      this.pickups.update(delta);
      this.updateCombo(delta);
      this.advanceWaves(delta);

      const narrowing = this.currentNarrowing();
      this.vessel.setNarrowing(narrowing / 100);
      this.vessel.setInflammation(this.stats.inflammation / 100);

      if (this.mode === 'playing') {
        if (this.stats.wallIntegrity <= 0) this.resolveRun('wall');
        else if (this.stats.xp >= this.stats.xpToNext) this.openLevelUp();
      }

      this.hud.update(this.stats, Math.round(narrowing), this.waveLabel(), this.waveRemaining, this.score);
      this.hud.setCombo(this.combo);
      this.hud.setBoss(this.enemies.bossActive, this.enemies.bossHpFrac());
    }

    this.measurePerf(delta);
    this.cameraRig.update(delta, this.guardian.group.position, 0.18);
    this.publishDiagnostics();
  }

  private advanceWaves(delta: number): void {
    this.phaseTime += delta;
    const bossWave = this.waveIndex === RUN.waveCount - 1;

    if (this.wavePhase === 'intro') {
      if (this.phaseTime >= 1.6) this.enterPhase('active');
      return;
    }
    if (this.wavePhase === 'active') {
      this.enemies.spawnMultiplier = 1 + (this.phaseTime / this.waveSeconds) * 0.8;
      if (bossWave) {
        this.waveRemaining = this.bossTime - this.phaseTime;
        if (this.enemies.bossDefeated) this.resolveRun('win');
        else if (this.phaseTime >= this.bossTime) this.resolveRun('bossTimeout');
      } else {
        this.waveRemaining = this.waveSeconds - this.phaseTime;
        if (this.phaseTime >= this.waveSeconds) this.enterPhase('reveal');
      }
      return;
    }
    if (this.phaseTime >= 2.6) {
      this.waveIndex += 1;
      this.enterPhase('intro');
    }
  }

  private enterPhase(phase: WavePhase): void {
    this.wavePhase = phase;
    this.phaseTime = 0;
    this.enemies.tier = Math.min(3, this.waveIndex + 1) as 1 | 2 | 3;
    const beat = WAVE_BEATS[Math.min(this.waveIndex, WAVE_BEATS.length - 1)];
    const bossWave = this.waveIndex === RUN.waveCount - 1;

    if (phase === 'intro') {
      this.enemies.spawnEnabled = false;
      this.enemies.spawnMultiplier = 1;
      this.overlays.toast(beat.hook, 'hook');
    } else if (phase === 'active') {
      this.enemies.spawnEnabled = true;
      this.waveRemaining = bossWave ? this.bossTime : this.waveSeconds;
      if (bossWave) {
        this.enemies.spawnBoss();
        this.sfx.boss();
        this.cameraRig.impulse(0.5);
        this.vfx.burst(new THREE.Vector3(RUN.arena.halfWidth + 3, 1.4, 0), '#ff3a2a', 22, 7, 0.8);
        this.overlays.toast('A thrombus is forming — break it down!', 'hook');
      }
    } else {
      this.enemies.spawnEnabled = false;
      this.overlays.toast(beat.reveal, 'reveal');
    }
  }

  private onKill(pos: THREE.Vector3, gemValue: number, variant: Variant): void {
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    this.score += variant === 'vldl' ? 30 : 10;
    this.sfx.clear();
    this.vfx.burst(pos, '#9ffff0', 5, 4.5, 0.4);
    for (let i = 0; i < gemValue; i += 1) this.pickups.spawnGem(pos, 1);
    if (Math.random() < 0.03) this.pickups.spawnChest(pos);
  }

  private onGem(value: number, pos: THREE.Vector3): void {
    this.stats.xp += value;
    this.score += Math.floor(value * 5 * (1 + Math.min(this.combo, 20) * 0.05));
    this.sfx.gem(this.combo);
    this.vfx.burst(pos, '#aef9e8', 3, 3, 0.3);
  }

  private onChest(pos: THREE.Vector3): void {
    this.stats.xp += this.stats.xpToNext; // guarantees a level-up
    this.score += 100;
    this.sfx.levelUp();
    this.vfx.burst(pos, '#ffd86b', 16, 5, 0.6);
  }

  private onEmbed(pos: THREE.Vector3): void {
    this.combo = 0;
    this.vfx.burst(pos, '#ff7a2e', 9, 5, 0.55);
    this.cameraRig.impulse(0.28);
    this.postfx.flashDamage(0.35);
    this.sfx.embed();
    if (this.stats.wallIntegrity < 35) this.overlays.toast('Vulnerable plaque — the cap is thinning.', 'info', 2600);
  }

  private onBossDefeat(pos: THREE.Vector3): void {
    this.triggerHitStop(0.16);
    this.cameraRig.impulse(0.7);
    this.vfx.burst(pos, '#ffd86b', 30, 9, 0.9);
    this.score += 500;
  }

  private onSurge(pos: THREE.Vector3): void {
    this.cameraRig.impulse(0.18);
    this.vfx.burst(pos, '#bfe6ff', 10, 6, 0.5);
  }

  private openLevelUp(): void {
    this.mode = 'levelup';
    this.enemies.spawnEnabled = false;
    this.sfx.levelUp();
    this.vfx.burst(this.guardian.group.position, '#9ffff0', 12, 5, 0.6);

    const cards = this.pickUpgradeCards();
    const evo = this.availableEvolution();
    const offered = evo ? [evo, ...cards.slice(0, 2)] : cards;
    this.overlays.showLevelUp(this.stats.level + 1, offered, (card) => this.applyChoice(card));
  }

  private pickUpgradeCards(): ChoiceCard[] {
    const pool = UPGRADES.filter((c) => c.minLevel <= this.stats.level);
    const out: ChoiceCard[] = [];
    while (out.length < 3 && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length);
      const c = pool.splice(i, 1)[0];
      out.push({ id: c.id, title: c.title, mechanism: c.mechanism, blurb: c.blurb });
    }
    return out;
  }

  private availableEvolution(): ChoiceCard | null {
    for (const e of EVOLUTIONS) {
      if (this.stats.evolutions[e.id]) continue;
      if (e.needs.every((u) => this.stats.upgrades[u] >= 3)) {
        return { id: e.id, title: e.title, mechanism: e.mechanism, blurb: e.blurb, evolution: true };
      }
    }
    return null;
  }

  private applyChoice(card: ChoiceCard): void {
    if (card.evolution) {
      this.stats.evolutions[card.id as 'cyclone' | 'macrophage' | 'surge'] = true;
      this.sfx.evolve();
      this.triggerHitStop(0.1);
      this.vfx.burst(this.guardian.group.position, '#ffd86b', 20, 6, 0.7);
      this.overlays.toast(`Evolved: ${card.title}`, 'reveal', 3000);
    } else {
      this.stats.upgrades[card.id as UpgradeId] += 1;
      this.sfx.uiClick();
    }
    this.stats.xp -= this.stats.xpToNext;
    this.stats.level += 1;
    this.stats.xpToNext = Math.ceil(this.stats.xpToNext * 1.5 + 2);
    recomputeDials(this.stats, this.artery.plaque);
    this.mode = 'playing';
    if (this.wavePhase === 'active') this.enemies.spawnEnabled = true;
  }

  private resolveRun(reason: EndReason): void {
    this.mode = 'over';
    this.enemies.spawnEnabled = false;
    const narrowing = Math.round(this.currentNarrowing());
    const didRupture = reason !== 'win';

    this.artery = {
      plaque: Math.min(100, this.artery.plaque + this.stats.foamEmbedded * FOAM_TO_PERCENT),
      runs: this.artery.runs + 1,
    };
    saveArtery(this.artery);

    if (didRupture) {
      this.postfx.flashDamage(1);
      this.cameraRig.impulse(0.9);
      this.triggerHitStop(0.14);
      this.vfx.burst(this.guardian.group.position, '#ff3a2a', 24, 8, 0.7);
      this.sfx.rupture();
    } else {
      this.cameraRig.impulse(0.3);
      this.vfx.burst(this.guardian.group.position, '#9ffff0', 26, 7, 0.7);
      this.sfx.evolve();
    }

    const summary: EndSummary = {
      won: !didRupture,
      ruptured: didRupture,
      narrowingPercent: narrowing,
      foamEmbedded: this.stats.foamEmbedded,
      ldlCleared: this.stats.ldlCleared,
      score: this.score,
      headline: didRupture ? 'Heart attack.' : 'You cleared it.',
      detail: this.endDetail(reason, narrowing),
      stickyFact: STICKY_FACT,
    };
    this.overlays.showEnd(summary, () => this.beginRun(), () => { this.artery = resetArtery(); this.beginRun(); });
  }

  private endDetail(reason: EndReason, narrowing: number): string {
    if (reason === 'win') return `Thrombus broken down, cap held. The ${this.stats.foamEmbedded} foam cells that embedded carry into your next run.`;
    if (reason === 'bossTimeout') return 'The thrombus ruptured before you could break it down — a clot sealed the artery.';
    return `Your artery was only ${narrowing}% narrowed — but a thin, inflamed cap ruptured and clotted.`;
  }

  private updateCombo(delta: number): void {
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  private updateHeartbeat(delta: number): void {
    this.beatAccum += delta * 1.1;
    const beat = Math.floor(this.beatAccum);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.sfx.heartbeat(0.8);
    }
  }

  private triggerHitStop(seconds: number): void {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  private measurePerf(delta: number): void {
    this.fpsAccum += delta;
    this.fpsFrames += 1;
    if (this.fpsAccum >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }
    // sample true scene draw cost once a second (extra render is overwritten by post)
    if (this.frame % 60 === 1) {
      this.renderer.render(this.scene, this.camera);
      this.sceneCalls = this.renderer.info.render.calls;
      this.sceneTris = this.renderer.info.render.triangles;
    }
    this.hud.setFps(this.fps, this.sceneCalls);
  }

  private currentNarrowing(): number {
    return Math.min(100, this.artery.plaque + this.stats.foamEmbedded * FOAM_TO_PERCENT);
  }

  private waveLabel(): string {
    return `Wave ${Math.min(this.waveIndex + 1, RUN.waveCount)}/${RUN.waveCount}`;
  }

  private publishDiagnostics(): void {
    const info = this.renderer.info;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: this.frame,
      elapsed: this.elapsed,
      score: this.score,
      targetScore: this.stats.foamEmbedded,
      complete: this.mode === 'over',
      player: {
        position: { x: this.guardian.group.position.x, y: this.guardian.group.position.y, z: this.guardian.group.position.z },
        speed: this.guardian.velocity.length(),
      },
      renderer: { calls: this.sceneCalls, triangles: this.sceneTris, geometries: info.memory.geometries, textures: info.memory.textures },
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
