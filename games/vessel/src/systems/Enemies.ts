import * as THREE from 'three';
import type { RunStats } from '../game/types';
import { RUN } from '../game/content';
import type { Vessel } from './Vessel';
import { makeLdlGeometry, makeFoamGeometry } from '../entities/models';

export interface Ldl {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  side: 1 | -1;
  targetX: number;
  state: 'drift' | 'sticking';
  oxidation: number;
  hp: number;
  alive: boolean;
}

const LDL_BASE_COLOR = new THREE.Color('#e8c24a');
const LDL_OX_COLOR = new THREE.Color('#ff5a1e');

// LDL particles: authored lipid globules that drift in, seek a bank, oxidise
// (waxy yellow -> molten emissive orange), and embed as lumpy foam-cell plaque.
// Three readable states: fresh, oxidising, embedded.
export class Enemies {
  spawnEnabled = false;

  private readonly ldls: Ldl[] = [];
  private readonly deposits: THREE.Mesh[] = [];
  private spawnTimer = 0;
  private readonly geo = makeLdlGeometry();
  private readonly foamGeos = [makeFoamGeometry(1), makeFoamGeometry(2), makeFoamGeometry(3)];
  private readonly depositMat = new THREE.MeshStandardMaterial({
    color: '#cdab46',
    roughness: 0.96,
    metalness: 0.0,
    emissive: '#2e2206',
    emissiveIntensity: 0.3,
  });
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly vessel: Vessel,
    private readonly onClear: (pos: THREE.Vector3) => void,
    private readonly onEmbed: (pos: THREE.Vector3) => void,
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
          ldl.vel.copy(this.tmp).multiplyScalar(2.4);
          ldl.vel.x -= 0.8; // blood flow drags downstream
          p.addScaledVector(ldl.vel, delta);
        }
      } else {
        ldl.oxidation += delta;
        const t = Math.min(1, ldl.oxidation / stats.oxidationSeconds);
        const mat = ldl.mesh.material as THREE.MeshStandardMaterial;
        mat.color.copy(LDL_BASE_COLOR).lerp(LDL_OX_COLOR, t);
        mat.emissive.copy(LDL_OX_COLOR);
        mat.emissiveIntensity = t * 1.8;
        ldl.mesh.scale.setScalar(1 + t * 0.4);
        ldl.spin.y = 1.5 + t * 6;
        if (ldl.oxidation >= stats.oxidationSeconds) this.embed(ldl, stats);
      }

      if (p.x < -RUN.arena.halfWidth - 2) this.kill(ldl);
    }
  }

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
      this.onClear(best.mesh.position);
      this.kill(best);
    }
    return true;
  }

  clearTouching(point: THREE.Vector3, radius: number): number {
    let cleared = 0;
    const r2 = radius * radius;
    for (const ldl of this.ldls) {
      if (!ldl.alive) continue;
      if (ldl.mesh.position.distanceToSquared(point) < r2) {
        this.onClear(ldl.mesh.position);
        this.kill(ldl);
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
        ldl.mesh.scale.setScalar(1);
        const mat = ldl.mesh.material as THREE.MeshStandardMaterial;
        mat.color.copy(LDL_BASE_COLOR);
        mat.emissiveIntensity = 0;
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
    for (const g of this.foamGeos) g.dispose();
    this.depositMat.dispose();
  }

  private spawn(): void {
    if (this.activeCount > 90) return;
    const recycled = this.ldls.find((l) => !l.alive);
    const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const z = side * (RUN.arena.halfDepth * (0.1 + Math.random() * 0.4));
    const mesh = recycled
      ? recycled.mesh
      : new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 }));
    mesh.position.set(RUN.arena.halfWidth + 1.5, 0.9, z);
    mesh.scale.setScalar(0.85 + Math.random() * 0.4);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    mesh.castShadow = true;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.copy(LDL_BASE_COLOR);
    mat.emissive.copy(LDL_OX_COLOR);
    mat.emissiveIntensity = 0;

    const data: Ldl = recycled ?? ({} as Ldl);
    data.mesh = mesh;
    data.vel = data.vel ?? new THREE.Vector3();
    data.spin = data.spin ?? new THREE.Vector3();
    data.spin.set(Math.random() * 1.4, Math.random() * 1.4, 0);
    data.side = side;
    data.targetX = -RUN.arena.halfWidth + 1 + Math.random() * (RUN.arena.halfWidth * 1.6);
    data.state = 'drift';
    data.oxidation = 0;
    data.hp = 2;
    data.alive = true;

    if (!recycled) this.ldls.push(data);
    this.scene.add(mesh);
  }

  private kill(ldl: Ldl): void {
    ldl.alive = false;
    this.scene.remove(ldl.mesh);
  }

  private embed(ldl: Ldl, stats: RunStats): void {
    const cluster = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < cluster; i += 1) {
      const geo = this.foamGeos[Math.floor(Math.random() * this.foamGeos.length)];
      const deposit = new THREE.Mesh(geo, this.depositMat);
      deposit.position.copy(ldl.mesh.position);
      deposit.position.x += (Math.random() - 0.5) * 0.8;
      deposit.position.z += ldl.side * Math.random() * 0.4;
      deposit.position.y = 0.4 + Math.random() * 0.3;
      deposit.scale.setScalar(0.6 + Math.random() * 0.6);
      deposit.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      deposit.castShadow = true;
      this.vessel.depositLayer.add(deposit);
      this.deposits.push(deposit);
    }

    stats.foamEmbedded += 1;
    stats.wallIntegrity = Math.max(0, stats.wallIntegrity - 5.5);
    stats.capStability = Math.max(0, stats.capStability - 2.2);
    stats.inflammation = Math.min(100, stats.inflammation + 5);

    this.onEmbed(ldl.mesh.position);
    this.kill(ldl);
  }
}
