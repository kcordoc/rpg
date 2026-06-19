import * as THREE from 'three';
import type { InputController } from '../core/InputController';

export type ArenaBounds = {
  halfWidth: number;
  halfDepth: number;
};

// The player. Diegetically an HDL particle — the bloodstream's cleanup crew.
// Move-only control (one thumb); all attacks are automatic, survivor-like.
export class Guardian {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  readonly aimDir = new THREE.Vector3(-1, 0, 0);

  private readonly move = new THREE.Vector2();
  private readonly targetVelocity = new THREE.Vector3();
  private readonly coreGeo = new THREE.IcosahedronGeometry(0.55, 1);
  private readonly haloGeo = new THREE.TorusGeometry(0.78, 0.07, 8, 28);
  private readonly coreMat = new THREE.MeshStandardMaterial({
    color: '#7fe9d0',
    roughness: 0.25,
    metalness: 0.2,
    emissive: '#1f8f7d',
    emissiveIntensity: 0.9,
  });
  private readonly haloMat = new THREE.MeshBasicMaterial({ color: '#bafff0', transparent: true, opacity: 0.8 });
  private readonly halo: THREE.Mesh;

  readonly speed = 8.2;

  constructor() {
    const core = new THREE.Mesh(this.coreGeo, this.coreMat);
    core.castShadow = true;
    this.group.add(core);

    this.halo = new THREE.Mesh(this.haloGeo, this.haloMat);
    this.halo.rotation.x = Math.PI / 2;
    this.group.add(this.halo);

    this.group.position.set(0, 0.9, 0);
  }

  update(delta: number, elapsed: number, input: InputController, bounds: ArenaBounds): void {
    input.readMovement(this.move);
    this.targetVelocity.set(this.move.x, 0, this.move.y).multiplyScalar(this.speed);

    const smoothing = 1 - Math.exp(-16 * delta);
    this.velocity.lerp(this.targetVelocity, smoothing);
    this.group.position.addScaledVector(this.velocity, delta);

    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -bounds.halfWidth + 0.7, bounds.halfWidth - 0.7);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -bounds.halfDepth + 0.7, bounds.halfDepth - 0.7);
    this.group.position.y = 0.9 + Math.sin(elapsed * 4) * 0.06;

    if (this.velocity.lengthSq() > 0.02) {
      this.aimDir.copy(this.velocity).setY(0).normalize();
    }

    this.halo.rotation.z = elapsed * 1.4;
  }

  dispose(): void {
    this.coreGeo.dispose();
    this.haloGeo.dispose();
    this.coreMat.dispose();
    this.haloMat.dispose();
  }
}
