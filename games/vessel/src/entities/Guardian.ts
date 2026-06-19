import * as THREE from 'three';
import type { InputController } from '../core/InputController';
import { makeGlowTexture } from './models';

export type ArenaBounds = {
  halfWidth: number;
  halfDepth: number;
};

// The player: an HDL lipoprotein — the bloodstream's cleanup crew. Authored as
// layered construction (glowing core + faceted transmissive shell + protein
// nodes + glow halo + directional flare) so it reads as a hero, not a primitive.
export class Guardian {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  readonly aimDir = new THREE.Vector3(-1, 0, 0);

  private readonly move = new THREE.Vector2();
  private readonly targetVelocity = new THREE.Vector3();
  private readonly shellGroup = new THREE.Group();
  private readonly flare: THREE.Sprite;
  private readonly halo: THREE.Sprite;
  private readonly disposables: Array<{ dispose(): void }> = [];

  readonly speed = 8.2;

  constructor() {
    // glowing inner core
    const coreGeo = new THREE.IcosahedronGeometry(0.42, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#d8fff6',
      emissive: '#36f0cf',
      emissiveIntensity: 1.3,
      roughness: 0.2,
      metalness: 0.1,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(core);
    this.disposables.push(coreGeo, coreMat);

    // faceted translucent shell — a cheap faux-glass (transparent standard
    // material), not transmission, to avoid a per-frame second scene render on
    // mobile. Reads as a crystalline lipoprotein membrane.
    const shellGeo = new THREE.IcosahedronGeometry(0.74, 1);
    const shellMat = new THREE.MeshStandardMaterial({
      color: '#7fe9d0',
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
      emissive: '#1a8f7d',
      emissiveIntensity: 0.6,
      depthWrite: false,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.castShadow = true;
    this.shellGroup.add(shell);
    this.disposables.push(shellGeo, shellMat);

    // apolipoprotein nodes studding the shell
    const nodeGeo = new THREE.SphereGeometry(0.12, 10, 10);
    const nodeMat = new THREE.MeshStandardMaterial({ color: '#bafff0', emissive: '#2fd6bd', emissiveIntensity: 1.4, roughness: 0.3 });
    const nodePositions = [
      new THREE.Vector3(0.7, 0.2, 0.1),
      new THREE.Vector3(-0.4, 0.5, 0.4),
      new THREE.Vector3(0.1, -0.6, -0.4),
      new THREE.Vector3(-0.5, -0.2, 0.55),
    ];
    for (const p of nodePositions) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.copy(p);
      this.shellGroup.add(node);
    }
    this.disposables.push(nodeGeo, nodeMat);
    this.group.add(this.shellGroup);

    // soft halo + directional flare (bloom catchers)
    const haloTex = makeGlowTexture('#9ffff0');
    const haloMat = new THREE.SpriteMaterial({ map: haloTex, color: '#9ffff0', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    this.halo = new THREE.Sprite(haloMat);
    this.halo.scale.setScalar(2.1);
    this.group.add(this.halo);
    this.disposables.push(haloTex, haloMat);

    const flareTex = makeGlowTexture('#c8fff6');
    const flareMat = new THREE.SpriteMaterial({ map: flareTex, color: '#7fe9d0', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    this.flare = new THREE.Sprite(flareMat);
    this.flare.scale.set(1.4, 0.5, 1);
    this.group.add(this.flare);
    this.disposables.push(flareTex, flareMat);

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

    const speed = this.velocity.length();
    if (speed > 0.05) this.aimDir.copy(this.velocity).setY(0).normalize();

    this.shellGroup.rotation.y = elapsed * 0.7;
    this.shellGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.3;

    // flare points the way the Guardian is heading and stretches with speed
    this.flare.position.set(this.aimDir.x * 0.7, 0, this.aimDir.z * 0.7);
    const stretch = 1.2 + Math.min(speed / this.speed, 1) * 1.1;
    this.flare.scale.set(stretch, 0.5, 1);
    (this.flare.material as THREE.SpriteMaterial).opacity = 0.35 + Math.min(speed / this.speed, 1) * 0.5;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
