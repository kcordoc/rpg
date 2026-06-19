import * as THREE from 'three';
import type { Guardian } from '../entities/Guardian';

type Kind = 'gem' | 'chest';

interface Pickup {
  mesh: THREE.Mesh;
  kind: Kind;
  value: number;
  vel: THREE.Vector3;
  bob: number;
  alive: boolean;
}

// Drops that keep a reward landing every few seconds (the Vampire-Survivors
// cadence): XP gems vacuum to the Guardian, and rare vesicle chests pop a
// jackpot. Magnetism turns positioning into a constant micro-decision.
export class Pickups {
  private readonly items: Pickup[] = [];
  private readonly gemGeo = new THREE.OctahedronGeometry(0.26, 0);
  private readonly gemMat = new THREE.MeshStandardMaterial({ color: '#aef9e8', emissive: '#28e0bf', emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.3 });
  private readonly chestGeo = new THREE.IcosahedronGeometry(0.5, 0);
  private readonly chestMat = new THREE.MeshStandardMaterial({ color: '#ffd86b', emissive: '#ff9a3c', emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.4 });
  private readonly tmp = new THREE.Vector3();

  magnetRange = 3.4;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly guardian: Guardian,
    private readonly onGem: (value: number, pos: THREE.Vector3) => void,
    private readonly onChest: (pos: THREE.Vector3) => void,
  ) {}

  spawnGem(pos: THREE.Vector3, value = 1): void {
    this.spawn('gem', pos, value);
  }

  spawnChest(pos: THREE.Vector3): void {
    this.spawn('chest', pos, 0);
  }

  update(delta: number): void {
    const gp = this.guardian.group.position;
    for (const it of this.items) {
      if (!it.alive) continue;
      const p = it.mesh.position;
      const range = it.kind === 'chest' ? this.magnetRange * 0.6 : this.magnetRange;
      const dist = p.distanceTo(gp);

      if (dist < range) {
        // magnet: accelerate toward the Guardian, snappier when closer
        this.tmp.copy(gp).sub(p).normalize();
        const pull = THREE.MathUtils.lerp(22, 6, dist / range);
        it.vel.lerp(this.tmp.multiplyScalar(pull), 1 - Math.exp(-10 * delta));
      } else {
        it.vel.multiplyScalar(1 - 2 * delta); // settle
      }
      p.addScaledVector(it.vel, delta);
      it.bob += delta;
      p.y = 0.7 + Math.sin(it.bob * 4) * 0.12;
      it.mesh.rotation.y += delta * 2.4;
      it.mesh.rotation.x += delta * 1.3;

      const collectAt = it.kind === 'chest' ? 0.9 : 0.7;
      if (dist < collectAt) {
        it.alive = false;
        it.mesh.visible = false;
        if (it.kind === 'chest') this.onChest(p);
        else this.onGem(it.value, p);
      }
    }
  }

  reset(): void {
    for (const it of this.items) {
      it.alive = false;
      it.mesh.visible = false;
    }
  }

  dispose(): void {
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items.length = 0;
    this.gemGeo.dispose();
    this.gemMat.dispose();
    this.chestGeo.dispose();
    this.chestMat.dispose();
  }

  private spawn(kind: Kind, pos: THREE.Vector3, value: number): void {
    let it = this.items.find((q) => !q.alive && q.kind === kind);
    if (!it) {
      const mesh = kind === 'chest' ? new THREE.Mesh(this.chestGeo, this.chestMat) : new THREE.Mesh(this.gemGeo, this.gemMat);
      mesh.castShadow = true;
      this.scene.add(mesh);
      it = { mesh, kind, value, vel: new THREE.Vector3(), bob: Math.random() * 6, alive: false };
      this.items.push(it);
    }
    it.value = value;
    it.alive = true;
    it.mesh.visible = true;
    it.mesh.position.copy(pos);
    it.mesh.position.y = 0.7;
    // little pop outward on drop
    const a = Math.random() * Math.PI * 2;
    it.vel.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(kind === 'chest' ? 0.6 : 2.2 + Math.random() * 1.5);
  }
}
