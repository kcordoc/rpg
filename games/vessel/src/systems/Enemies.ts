import * as THREE from 'three';
import type { RunStats } from '../game/types';
import { RUN } from '../game/content';
import type { Vessel } from './Vessel';

export interface Ldl {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  side: 1 | -1;
  targetX: number;
  state: 'drift' | 'sticking';
  oxidation: number;
  hp: number;
  alive: boolean;
}

const LDL_BASE_COLOR = new THREE.Color('#ffd34d');
const LDL_OX_COLOR = new THREE.Color('#ff6a2b');

// LDL particles: spawn upstream, seek the nearest wall, and — if not cleared in
// time — oxidise and embed as a foam cell (permanent plaque + wall damage).
export class Enemies {
  spawnEnabled = false;

  private readonly ldls: Ldl[] = [];
  private readonly deposits: THREE.Mesh[] = [];
  private spawnTimer = 0;
  private readonly geo = new THREE.SphereGeometry(0.34, 10, 10);
  private readonly depositGeo = new THREE.DodecahedronGeometry(0.42, 0);
  private readonly depositMat = new THREE.MeshStandardMaterial({
    color: '#caa23a',
    roughness: 0.95,
    emissive: '#3a2a06',
    emissiveIntensity: 0.3,
  });
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly vessel: Vessel,
    private readonly onClear: () => void,
    private readonly onEmbed: () => void,
  ) {}

  get activeCount(): number {
    return this.ldls.filter((l) => l.alive).length;
  }

  list(): readonly Ldl[] {
    return this.ldls;
  }

  update(delta: number, stats: RunStats): void {
    if (this.spawnEnabled) {
      this.spawnTimer += delta;
      const interval = 1 / stats.spawnRate;
      while (this.spawnTimer >= interval) {
        this.spawnTimer -= interval;
        this.spawn();
      }
    }

    for (const ldl of this.ldls) {
      if (!ldl.alive) continue;
      const p = ldl.mesh.position;

      if (ldl.state === 'drift') {
        const targetZ = this.vessel.wallZ(ldl.side);
        this.tmp.set(ldl.targetX, p.y, targetZ).sub(p);
        const dist = this.tmp.length();
        if (dist < 0.45) {
          ldl.state = 'sticking';
          ldl.vel.set(0, 0, 0);
        } else {
          this.tmp.normalize();
          // overall blood flow drags everything gently downstream (-X) too
          ldl.vel.copy(this.tmp).multiplyScalar(2.4);
          ldl.vel.x -= 0.8;
          p.addScaledVector(ldl.vel, delta);
        }
      } else {
        // stuck to the wall, oxidising
        ldl.oxidation += delta;
        const t = Math.min(1, ldl.oxidation / stats.oxidationSeconds);
        (ldl.mesh.material as THREE.MeshStandardMaterial).color.copy(LDL_BASE_COLOR).lerp(LDL_OX_COLOR, t);
        ldl.mesh.scale.setScalar(1 + t * 0.35);
        if (ldl.oxidation >= stats.oxidationSeconds) {
          this.embed(ldl, stats);
        }
      }

      // flowed all the way through without embedding: cleared from blood naturally
      if (p.x < -RUN.arena.halfWidth - 2) this.kill(ldl);
    }
  }

  /** weapons call this to damage the LDL nearest to a point within range */
  damageNearest(point: THREE.Vector3, range: number, amount: number): boolean {
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
    if (best.hp <= 0) {
      this.kill(best);
      this.onClear();
    }
    return true;
  }

  /** HDL escort / collision clear: kill any LDL touching a point */
  clearTouching(point: THREE.Vector3, radius: number): number {
    let cleared = 0;
    const r2 = radius * radius;
    for (const ldl of this.ldls) {
      if (!ldl.alive) continue;
      if (ldl.mesh.position.distanceToSquared(point) < r2) {
        this.kill(ldl);
        this.onClear();
        cleared += 1;
      }
    }
    return cleared;
  }

  /** shear wave: knock sticking LDL back into the flow, resetting oxidation */
  shearFrom(center: THREE.Vector3, radius: number): void {
    const r2 = radius * radius;
    for (const ldl of this.ldls) {
      if (!ldl.alive || ldl.state !== 'sticking') continue;
      if (ldl.mesh.position.distanceToSquared(center) < r2) {
        ldl.state = 'drift';
        ldl.oxidation = 0;
        ldl.targetX = ldl.mesh.position.x - 3 - Math.random() * 3;
        ldl.mesh.scale.setScalar(1);
      }
    }
  }

  reset(): void {
    for (const ldl of this.ldls) {
      this.scene.remove(ldl.mesh);
      (ldl.mesh.material as THREE.Material).dispose();
    }
    this.ldls.length = 0;
  }

  dispose(): void {
    this.reset();
    for (const d of this.deposits) this.vessel.depositLayer.remove(d);
    this.deposits.length = 0;
    this.geo.dispose();
    this.depositGeo.dispose();
    this.depositMat.dispose();
  }

  private spawn(): void {
    // cap concurrent LDL for mobile perf
    if (this.activeCount > 90) return;
    const recycled = this.ldls.find((l) => !l.alive);
    const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const z = side * (RUN.arena.halfDepth * (0.1 + Math.random() * 0.4));
    const mesh = recycled
      ? recycled.mesh
      : new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, emissive: '#5a3a00', emissiveIntensity: 0.4 }));
    mesh.position.set(RUN.arena.halfWidth + 1.5, 0.9, z);
    mesh.scale.setScalar(1);
    mesh.castShadow = true;
    (mesh.material as THREE.MeshStandardMaterial).color.copy(LDL_BASE_COLOR);

    const data: Ldl = recycled ?? ({} as Ldl);
    data.mesh = mesh;
    data.vel = data.vel ?? new THREE.Vector3();
    data.side = side;
    data.targetX = -RUN.arena.halfWidth + 1 + Math.random() * (RUN.arena.halfWidth * 1.6);
    data.state = 'drift';
    data.oxidation = 0;
    data.hp = 2;
    data.alive = true;

    if (!recycled) {
      this.ldls.push(data);
      this.scene.add(mesh);
    } else {
      this.scene.add(mesh);
    }
  }

  private kill(ldl: Ldl): void {
    ldl.alive = false;
    this.scene.remove(ldl.mesh);
  }

  private embed(ldl: Ldl, stats: RunStats): void {
    const deposit = new THREE.Mesh(this.depositGeo, this.depositMat);
    deposit.position.copy(ldl.mesh.position);
    deposit.position.y = 0.5;
    deposit.scale.setScalar(0.7 + Math.random() * 0.5);
    deposit.castShadow = true;
    this.vessel.depositLayer.add(deposit);
    this.deposits.push(deposit);

    stats.foamEmbedded += 1;
    stats.wallIntegrity = Math.max(0, stats.wallIntegrity - 5.5);
    stats.capStability = Math.max(0, stats.capStability - 2.2);
    stats.inflammation = Math.min(100, stats.inflammation + 5);

    this.kill(ldl);
    this.onEmbed();
  }
}
