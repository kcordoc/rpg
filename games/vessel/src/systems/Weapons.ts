import * as THREE from 'three';
import type { RunStats } from '../game/types';
import type { Enemies } from './Enemies';
import type { Guardian } from '../entities/Guardian';

interface Projectile {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  alive: boolean;
}

interface Ring {
  mesh: THREE.Mesh;
  age: number;
  max: number;
}

// All automatic. Positioning is the only skill: the player moves the Guardian,
// the weapons fire themselves. Each weapon maps to a real clearance mechanism.
export class Weapons {
  private readonly projectiles: Projectile[] = [];
  private readonly orbiters: THREE.Mesh[] = [];
  private readonly rings: Ring[] = [];

  private fireTimer = 0;
  private shearTimer = 0;
  private orbitAngle = 0;

  private readonly projGeo = new THREE.SphereGeometry(0.16, 8, 8);
  private readonly projMat = new THREE.MeshBasicMaterial({ color: '#aef9e8' });
  private readonly orbiterGeo = new THREE.IcosahedronGeometry(0.28, 0);
  private readonly orbiterMat = new THREE.MeshStandardMaterial({
    color: '#6fe6ff',
    emissive: '#1d6f8f',
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1.15, 40);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: '#8fffe6', transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly guardian: Guardian,
    private readonly enemies: Enemies,
  ) {}

  update(delta: number, stats: RunStats): void {
    this.updateFire(delta, stats);
    this.updateProjectiles(delta);
    this.updateOrbiters(delta, stats);
    this.updateShear(delta, stats);
    this.updateRings(delta);
  }

  reset(): void {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles.length = 0;
    for (const r of this.rings) this.scene.remove(r.mesh);
    this.rings.length = 0;
  }

  dispose(): void {
    this.reset();
    for (const o of this.orbiters) this.scene.remove(o);
    this.orbiters.length = 0;
    this.projGeo.dispose();
    this.projMat.dispose();
    this.orbiterGeo.dispose();
    this.orbiterMat.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
  }

  private updateFire(delta: number, stats: RunStats): void {
    this.fireTimer += delta;
    if (this.fireTimer < stats.fireInterval) return;
    const target = this.nearestEnemy();
    if (!target) return;
    this.fireTimer = 0;

    const proj = this.projectiles.find((p) => !p.alive) ?? this.makeProjectile();
    proj.mesh.position.copy(this.guardian.group.position);
    proj.vel.copy(target).sub(this.guardian.group.position).setY(0).normalize().multiplyScalar(20);
    proj.life = 1.1;
    proj.alive = true;
    proj.mesh.visible = true;
  }

  private updateProjectiles(delta: number): void {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.life -= delta;
      proj.mesh.position.addScaledVector(proj.vel, delta);
      if (this.enemies.damageNearest(proj.mesh.position, 0.55, 2)) {
        this.retire(proj);
        continue;
      }
      if (proj.life <= 0) this.retire(proj);
    }
  }

  private updateOrbiters(delta: number, stats: RunStats): void {
    const wanted = stats.upgrades.hdl;
    while (this.orbiters.length < wanted) {
      const m = new THREE.Mesh(this.orbiterGeo, this.orbiterMat);
      this.scene.add(m);
      this.orbiters.push(m);
    }
    if (wanted === 0) return;
    this.orbitAngle += delta * 2.4;
    const radius = 1.9;
    for (let i = 0; i < this.orbiters.length; i += 1) {
      const a = this.orbitAngle + (i / this.orbiters.length) * Math.PI * 2;
      const m = this.orbiters[i];
      m.position.set(
        this.guardian.group.position.x + Math.cos(a) * radius,
        0.9,
        this.guardian.group.position.z + Math.sin(a) * radius,
      );
      this.enemies.clearTouching(m.position, 0.55);
    }
  }

  private updateShear(delta: number, stats: RunStats): void {
    if (stats.upgrades.shear === 0) return;
    this.shearTimer += delta;
    const interval = Math.max(1.4, 4 - stats.upgrades.shear * 0.45);
    if (this.shearTimer < interval) return;
    this.shearTimer = 0;

    const radius = 3.2 + stats.upgrades.shear * 0.7;
    this.enemies.shearFrom(this.guardian.group.position, radius);
    // exercise firms the cap and calms inflammation
    stats.capStability = Math.min(100, stats.capStability + 1.4 * stats.upgrades.shear);
    stats.inflammation = Math.max(0, stats.inflammation - 2.5);

    const ring = this.makeRing(radius);
    ring.mesh.position.copy(this.guardian.group.position);
    ring.mesh.position.y = 0.2;
  }

  private updateRings(delta: number): void {
    for (const ring of this.rings) {
      if (ring.age < 0) continue;
      ring.age += delta;
      const t = ring.age / 0.6;
      const scale = THREE.MathUtils.lerp(0.3, ring.max, Math.min(1, t));
      ring.mesh.scale.setScalar(scale);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - Math.min(1, t));
      if (t >= 1) {
        ring.age = -1;
        ring.mesh.visible = false;
      }
    }
  }

  private nearestEnemy(): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestDist = Infinity;
    for (const ldl of this.enemies.list()) {
      if (!ldl.alive) continue;
      const d = ldl.mesh.position.distanceToSquared(this.guardian.group.position);
      if (d < bestDist) {
        bestDist = d;
        best = ldl.mesh.position;
      }
    }
    return best ? this.tmp.copy(best) : null;
  }

  private makeProjectile(): Projectile {
    const proj: Projectile = { mesh: new THREE.Mesh(this.projGeo, this.projMat), vel: new THREE.Vector3(), life: 0, alive: false };
    this.scene.add(proj.mesh);
    this.projectiles.push(proj);
    return proj;
  }

  private retire(proj: Projectile): void {
    proj.alive = false;
    proj.mesh.visible = false;
  }

  private makeRing(max: number): Ring {
    const reused = this.rings.find((r) => r.age < 0);
    if (reused) {
      reused.age = 0;
      reused.max = max;
      reused.mesh.visible = true;
      (reused.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55;
      return reused;
    }
    const mesh = new THREE.Mesh(this.ringGeo, this.ringMat.clone());
    mesh.rotation.x = -Math.PI / 2;
    this.scene.add(mesh);
    const ring: Ring = { mesh, age: 0, max };
    this.rings.push(ring);
    return ring;
  }
}
