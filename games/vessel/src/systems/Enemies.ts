import * as THREE from 'three';
import type { RunStats } from '../game/types';
import { RUN } from '../game/content';
import type { Vessel } from './Vessel';
import { makeLdlGeometry, makeFoamGeometry, makeBossGeometry } from '../entities/models';

export type Variant = 'ldl' | 'vldl' | 'fast';

export interface Ldl {
  mesh: THREE.Mesh;
  variant: Variant;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  side: 1 | -1;
  targetX: number;
  state: 'drift' | 'sticking';
  oxidation: number;
  hp: number;
  baseScale: number;
  intro: number;
  speed: number;
  gemValue: number;
  embedDamage: number;
  alive: boolean;
}

interface VariantConfig {
  hp: number;
  speed: number;
  scale: number;
  gemValue: number;
  embedDamage: number;
  color: THREE.Color;
  preOxidized: boolean;
}

const CONFIG: Record<Variant, VariantConfig> = {
  ldl: { hp: 2, speed: 2.4, scale: 1.0, gemValue: 1, embedDamage: 5.5, color: new THREE.Color('#e8c24a'), preOxidized: false },
  vldl: { hp: 6, speed: 1.5, scale: 1.8, gemValue: 3, embedDamage: 9, color: new THREE.Color('#e0741e'), preOxidized: false },
  fast: { hp: 1, speed: 4.0, scale: 0.7, gemValue: 1, embedDamage: 4, color: new THREE.Color('#ff6a2e'), preOxidized: true },
};

const OX_COLOR = new THREE.Color('#ff5a1e');

// The enemy family: small LDL, heavy VLDL, fast oxidised sdLDL, and a Thrombus
// boss. Each clears into XP gems; uncleared ones oxidise and embed as foam-cell
// plaque. Variants read by size, colour, speed, and a spawn pop telegraph.
export class Enemies {
  spawnEnabled = false;
  tier: 1 | 2 | 3 = 1;
  spawnMultiplier = 1;

  private readonly ldls: Ldl[] = [];
  private readonly deposits: THREE.Mesh[] = [];
  private spawnTimer = 0;

  private readonly geo = makeLdlGeometry();
  private readonly foamGeos = [makeFoamGeometry(1), makeFoamGeometry(2), makeFoamGeometry(3)];
  private readonly depositMat = new THREE.MeshStandardMaterial({ color: '#cdab46', roughness: 0.96, emissive: '#2e2206', emissiveIntensity: 0.3 });

  // ---- boss ----
  private readonly bossGeo = makeBossGeometry();
  private readonly bossMat = new THREE.MeshStandardMaterial({ color: '#5e0d14', roughness: 0.7, metalness: 0.1, emissive: '#aa1820', emissiveIntensity: 0.5 });
  private boss: THREE.Mesh | null = null;
  private bossHp = 0;
  private bossMaxHp = 1;
  private bossSpitTimer = 0;
  bossDefeated = false;

  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly vessel: Vessel,
    private readonly onKill: (pos: THREE.Vector3, gemValue: number, variant: Variant) => void,
    private readonly onEmbed: (pos: THREE.Vector3) => void,
    private readonly onBossDefeat: (pos: THREE.Vector3) => void,
  ) {}

  get activeCount(): number {
    return this.ldls.reduce((n, l) => n + (l.alive ? 1 : 0), 0);
  }

  get bossActive(): boolean {
    return this.boss !== null;
  }

  bossHpFrac(): number {
    return this.boss ? this.bossHp / this.bossMaxHp : 0;
  }

  list(): readonly Ldl[] {
    return this.ldls;
  }

  update(delta: number, stats: RunStats): void {
    if (this.spawnEnabled) {
      this.spawnTimer += delta;
      const interval = 1 / (stats.spawnRate * this.spawnMultiplier);
      while (this.spawnTimer >= interval) {
        this.spawnTimer -= interval;
        this.spawn(this.pickVariant());
      }
    }

    for (const ldl of this.ldls) {
      if (!ldl.alive) continue;
      this.stepLdl(ldl, delta, stats);
    }

    this.stepBoss(delta);
  }

  /** weapons aim at the closest target — boss included */
  nearestTarget(point: THREE.Vector3): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestDist = Infinity;
    for (const ldl of this.ldls) {
      if (!ldl.alive) continue;
      const d = ldl.mesh.position.distanceToSquared(point);
      if (d < bestDist) {
        bestDist = d;
        best = ldl.mesh.position;
      }
    }
    if (this.boss) {
      const d = this.boss.position.distanceToSquared(point);
      if (d < bestDist) best = this.boss.position;
    }
    return best ? this.tmp.copy(best) : null;
  }

  damageNearest(point: THREE.Vector3, range: number, amount: number): boolean {
    // boss soaks any hit that lands on its large body
    if (this.boss && point.distanceTo(this.boss.position) < 1.9 + range) {
      this.damageBoss(amount);
      return true;
    }
    let best: Ldl | null = null;
    let bestDist = range * range;
    for (const ldl of this.ldls) {
      if (!ldl.alive) continue;
      const d = ldl.mesh.position.distanceToSquared(point);
      if (d < bestDist) {
        bestDist = d;
        best = ldl;
      }
    }
    if (!best) return false;
    best.hp -= amount;
    if (best.hp <= 0) this.kill(best, true);
    return true;
  }

  clearTouching(point: THREE.Vector3, radius: number): number {
    if (this.boss && point.distanceTo(this.boss.position) < 1.9 + radius) this.damageBoss(1.2);
    let cleared = 0;
    const r2 = radius * radius;
    for (const ldl of this.ldls) {
      if (!ldl.alive) continue;
      if (ldl.mesh.position.distanceToSquared(point) < r2) {
        this.kill(ldl, true);
        cleared += 1;
      }
    }
    return cleared;
  }

  shearFrom(center: THREE.Vector3, radius: number): void {
    const r2 = radius * radius;
    for (const ldl of this.ldls) {
      if (!ldl.alive || ldl.state !== 'sticking') continue;
      if (ldl.mesh.position.distanceToSquared(center) < r2) {
        ldl.state = 'drift';
        ldl.oxidation = 0;
        ldl.targetX = ldl.mesh.position.x - 3 - Math.random() * 3;
        const mat = ldl.mesh.material as THREE.MeshStandardMaterial;
        mat.color.copy(CONFIG[ldl.variant].color);
        mat.emissiveIntensity = CONFIG[ldl.variant].preOxidized ? 1.4 : 0;
      }
    }
  }

  spawnBoss(): void {
    this.bossDefeated = false;
    this.boss = new THREE.Mesh(this.bossGeo, this.bossMat);
    this.boss.position.set(RUN.arena.halfWidth + 3, 1.4, 0);
    this.boss.castShadow = true;
    this.scene.add(this.boss);
    this.bossMaxHp = 150;
    this.bossHp = this.bossMaxHp;
    this.bossSpitTimer = 0;
  }

  reset(): void {
    for (const ldl of this.ldls) {
      this.scene.remove(ldl.mesh);
      (ldl.mesh.material as THREE.Material).dispose();
    }
    this.ldls.length = 0;
    for (const d of this.deposits) this.vessel.depositLayer.remove(d);
    this.deposits.length = 0;
    this.clearBoss();
    this.spawnMultiplier = 1;
    this.tier = 1;
  }

  dispose(): void {
    this.reset();
    this.geo.dispose();
    for (const g of this.foamGeos) g.dispose();
    this.depositMat.dispose();
    this.bossGeo.dispose();
    this.bossMat.dispose();
  }

  private stepLdl(ldl: Ldl, delta: number, stats: RunStats): void {
    const p = ldl.mesh.position;
    if (ldl.intro < 1) {
      ldl.intro = Math.min(1, ldl.intro + delta * 3);
      ldl.mesh.scale.setScalar(ldl.baseScale * this.easeOut(ldl.intro));
    }
    ldl.mesh.rotation.x += ldl.spin.x * delta;
    ldl.mesh.rotation.y += ldl.spin.y * delta;

    if (ldl.state === 'drift') {
      const targetZ = this.vessel.wallZ(ldl.side);
      this.tmp.set(ldl.targetX, p.y, targetZ).sub(p);
      const dist = this.tmp.length();
      if (dist < 0.5) {
        ldl.state = 'sticking';
        ldl.vel.set(0, 0, 0);
      } else {
        this.tmp.normalize();
        ldl.vel.copy(this.tmp).multiplyScalar(ldl.speed);
        ldl.vel.x -= 0.8;
        p.addScaledVector(ldl.vel, delta);
      }
    } else {
      ldl.oxidation += delta;
      const t = Math.min(1, ldl.oxidation / stats.oxidationSeconds);
      const mat = ldl.mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(CONFIG[ldl.variant].color).lerp(OX_COLOR, t);
      mat.emissive.copy(OX_COLOR);
      mat.emissiveIntensity = Math.max(mat.emissiveIntensity, t * 1.8);
      ldl.mesh.scale.setScalar(ldl.baseScale * (1 + t * 0.4));
      ldl.spin.y = 1.5 + t * 6;
      if (ldl.oxidation >= stats.oxidationSeconds) this.embed(ldl, stats);
    }

    if (p.x < -RUN.arena.halfWidth - 2) this.kill(ldl, false);
  }

  private stepBoss(delta: number): void {
    if (!this.boss) return;
    const target = RUN.arena.halfWidth - 2.5;
    if (this.boss.position.x > target) this.boss.position.x -= delta * 1.6;
    this.boss.position.y = 1.4 + Math.sin(performance.now() * 0.002) * 0.25;
    this.boss.rotation.y += delta * 0.4;
    const pulse = 0.5 + Math.abs(Math.sin(performance.now() * 0.004)) * 0.7;
    this.bossMat.emissiveIntensity = pulse + (1 - this.bossHpFrac()) * 1.2;

    this.bossSpitTimer += delta;
    if (this.bossSpitTimer > 2.2) {
      this.bossSpitTimer = 0;
      for (let i = 0; i < 2; i += 1) this.spawnAt('ldl', this.boss.position.x - 1, (Math.random() - 0.5) * RUN.arena.halfDepth);
    }
  }

  private damageBoss(amount: number): void {
    if (!this.boss) return;
    this.bossHp -= amount;
    this.bossMat.emissive.setRGB(1, 0.4, 0.4);
    if (this.bossHp <= 0) {
      const pos = this.boss.position.clone();
      this.clearBoss();
      this.bossDefeated = true;
      this.onBossDefeat(pos);
    }
  }

  private clearBoss(): void {
    if (this.boss) {
      this.scene.remove(this.boss);
      this.boss = null;
    }
  }

  private pickVariant(): Variant {
    const r = Math.random();
    if (this.tier === 1) return r < 0.85 ? 'ldl' : 'fast';
    if (this.tier === 2) return r < 0.6 ? 'ldl' : r < 0.85 ? 'fast' : 'vldl';
    return r < 0.45 ? 'ldl' : r < 0.72 ? 'fast' : 'vldl';
  }

  private spawn(variant: Variant): void {
    if (this.activeCount > 95) return;
    const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const z = side * (RUN.arena.halfDepth * (0.1 + Math.random() * 0.4));
    this.spawnAt(variant, RUN.arena.halfWidth + 1.5, z, side);
  }

  private spawnAt(variant: Variant, x: number, z: number, sideHint?: 1 | -1): void {
    const cfg = CONFIG[variant];
    const side: 1 | -1 = sideHint ?? (z >= 0 ? 1 : -1);
    const recycled = this.ldls.find((l) => !l.alive);
    const mesh = recycled
      ? recycled.mesh
      : new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }));
    mesh.position.set(x, 0.9, z);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    mesh.castShadow = true;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.copy(cfg.color);
    mat.emissive.copy(OX_COLOR);
    mat.emissiveIntensity = cfg.preOxidized ? 1.4 : 0;

    const baseScale = cfg.scale * (0.85 + Math.random() * 0.3);
    mesh.scale.setScalar(0.01);

    const data: Ldl = recycled ?? ({} as Ldl);
    data.mesh = mesh;
    data.variant = variant;
    data.vel = data.vel ?? new THREE.Vector3();
    data.spin = data.spin ?? new THREE.Vector3();
    data.spin.set(Math.random() * 1.4, Math.random() * 1.4, 0);
    data.side = side;
    data.targetX = -RUN.arena.halfWidth + 1 + Math.random() * (RUN.arena.halfWidth * 1.6);
    data.state = 'drift';
    data.oxidation = 0;
    data.hp = cfg.hp;
    data.baseScale = baseScale;
    data.intro = 0;
    data.speed = cfg.speed;
    data.gemValue = cfg.gemValue;
    data.embedDamage = cfg.embedDamage;
    data.alive = true;

    if (!recycled) this.ldls.push(data);
    this.scene.add(mesh);
  }

  private kill(ldl: Ldl, rewarded: boolean): void {
    ldl.alive = false;
    this.scene.remove(ldl.mesh);
    if (rewarded) this.onKill(ldl.mesh.position, ldl.gemValue, ldl.variant);
  }

  private embed(ldl: Ldl, stats: RunStats): void {
    const cluster = 1 + Math.floor(Math.random() * 2) + (ldl.variant === 'vldl' ? 1 : 0);
    for (let i = 0; i < cluster; i += 1) {
      const geo = this.foamGeos[Math.floor(Math.random() * this.foamGeos.length)];
      const deposit = new THREE.Mesh(geo, this.depositMat);
      deposit.position.copy(ldl.mesh.position);
      deposit.position.x += (Math.random() - 0.5) * 0.8;
      deposit.position.z += ldl.side * Math.random() * 0.4;
      deposit.position.y = 0.4 + Math.random() * 0.3;
      deposit.scale.setScalar((0.6 + Math.random() * 0.6) * (ldl.variant === 'vldl' ? 1.5 : 1));
      deposit.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      deposit.castShadow = true;
      this.vessel.depositLayer.add(deposit);
      this.deposits.push(deposit);
    }

    stats.foamEmbedded += 1;
    stats.wallIntegrity = Math.max(0, stats.wallIntegrity - ldl.embedDamage);
    stats.capStability = Math.max(0, stats.capStability - 2.2);
    stats.inflammation = Math.min(100, stats.inflammation + 5);

    this.onEmbed(ldl.mesh.position);
    ldl.alive = false;
    this.scene.remove(ldl.mesh);
  }

  private easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
}
