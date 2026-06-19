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

// All-automatic weapons; positioning is the only skill. Each maps to a real
// clearance mechanism, and pairs evolve into "break the game" synergy builds.
export class Weapons {
  private readonly projectiles: Projectile[] = [];
  private readonly orbiters: THREE.Mesh[] = [];
  private readonly rings: Ring[] = [];

  private fireTimer = 0;
  private shearTimer = 0;
  private surgeTimer = 0;
  private orbitAngle = 0;

  // evolution actors (created lazily)
  private cyclone: THREE.Mesh | null = null;
  private macrophage: THREE.Mesh | null = null;

  private readonly projGeo = new THREE.SphereGeometry(0.16, 8, 8);
  private readonly projMat = new THREE.MeshBasicMaterial({ color: '#aef9e8' });
  private readonly orbiterGeo = new THREE.IcosahedronGeometry(0.28, 0);
  private readonly orbiterMat = new THREE.MeshStandardMaterial({ color: '#6fe6ff', emissive: '#1d6f8f', emissiveIntensity: 1.4, roughness: 0.3 });
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1.15, 40);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: '#8fffe6', transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly guardian: Guardian,
    private readonly enemies: Enemies,
    private readonly onSurge: (pos: THREE.Vector3) => void,
  ) {}

  update(delta: number, stats: RunStats): void {
    this.updateFire(delta, stats);
    this.updateProjectiles(delta);
    this.updateOrbiters(delta, stats);
    this.updateShear(delta, stats);
    this.updateEvolutions(delta, stats);
    this.updateRings(delta);
  }

  reset(): void {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles.length = 0;
    for (const r of this.rings) this.scene.remove(r.mesh);
    this.rings.length = 0;
    for (const o of this.orbiters) this.scene.remove(o);
    this.orbiters.length = 0;
    if (this.cyclone) { this.scene.remove(this.cyclone); this.cyclone = null; }
    if (this.macrophage) { this.scene.remove(this.macrophage); this.macrophage = null; }
  }

  dispose(): void {
    this.reset();
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
    const target = this.enemies.nearestTarget(this.guardian.group.position);
    if (!target) return;
    this.fireTimer = 0;
    const proj = this.projectiles.find((p) => !p.alive) ?? this.makeProjectile();
    proj.mesh.position.copy(this.guardian.group.position);
    proj.vel.copy(target).sub(this.guardian.group.position).setY(0).normalize().multiplyScalar(22);
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
      m.position.set(this.guardian.group.position.x + Math.cos(a) * radius, 0.9, this.guardian.group.position.z + Math.sin(a) * radius);
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
    stats.capStability = Math.min(100, stats.capStability + 1.4 * stats.upgrades.shear);
    stats.inflammation = Math.max(0, stats.inflammation - 2.5);
    this.makeRing(radius).mesh.position.copy(this.guardian.group.position).setY(0.2);
  }

  private updateEvolutions(delta: number, stats: RunStats): void {
    const gp = this.guardian.group.position;

    // Reverse-Transport Cyclone: a large sweeping ring that both clears and stabilises
    if (stats.evolutions.cyclone) {
      if (!this.cyclone) {
        this.cyclone = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.16, 10, 40), new THREE.MeshStandardMaterial({ color: '#7afff0', emissive: '#39d6c4', emissiveIntensity: 1.8, roughness: 0.3 }));
        this.cyclone.rotation.x = Math.PI / 2;
        this.scene.add(this.cyclone);
      }
      this.orbitAngle += delta;
      this.cyclone.position.set(gp.x, 0.6, gp.z);
      this.cyclone.rotation.z += delta * 3;
      // sample points around the ring to clear LDL it sweeps
      for (let i = 0; i < 6; i += 1) {
        const a = this.orbitAngle * 2 + (i / 6) * Math.PI * 2;
        this.tmp.set(gp.x + Math.cos(a) * 2.7, 0.9, gp.z + Math.sin(a) * 2.7);
        this.enemies.clearTouching(this.tmp, 0.7);
      }
    }

    // Macrophage Patrol: an autonomous hunter that chases the nearest target
    if (stats.evolutions.macrophage) {
      if (!this.macrophage) {
        this.macrophage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshStandardMaterial({ color: '#3a5a52', emissive: '#7fe6c8', emissiveIntensity: 0.9, roughness: 0.5 }));
        this.macrophage.position.copy(gp);
        this.scene.add(this.macrophage);
      }
      const target = this.enemies.nearestTarget(this.macrophage.position);
      if (target) {
        this.tmp.copy(target).sub(this.macrophage.position).normalize();
        this.macrophage.position.addScaledVector(this.tmp, delta * 10);
        this.macrophage.position.y = 0.9;
      }
      this.macrophage.rotation.y += delta * 4;
      this.enemies.clearTouching(this.macrophage.position, 0.7);
    }

    // Statin Surge: periodic vessel-wide nova
    if (stats.evolutions.surge) {
      this.surgeTimer += delta;
      if (this.surgeTimer > 5) {
        this.surgeTimer = 0;
        const cleared = this.enemies.clearTouching(gp, 8.5);
        this.enemies.damageNearest(gp, 6, 12); // chip the boss too
        const ring = this.makeRing(8.5);
        ring.mesh.position.copy(gp).setY(0.25);
        (ring.mesh.material as THREE.MeshBasicMaterial).color.set('#bfe6ff');
        if (cleared >= 0) this.onSurge(gp.clone());
      }
    }
  }

  private updateRings(delta: number): void {
    for (const ring of this.rings) {
      if (ring.age < 0) continue;
      ring.age += delta;
      const t = ring.age / 0.6;
      ring.mesh.scale.setScalar(THREE.MathUtils.lerp(0.3, ring.max, Math.min(1, t)));
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - Math.min(1, t));
      if (t >= 1) {
        ring.age = -1;
        ring.mesh.visible = false;
      }
    }
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
      (reused.mesh.material as THREE.MeshBasicMaterial).color.set('#8fffe6');
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
