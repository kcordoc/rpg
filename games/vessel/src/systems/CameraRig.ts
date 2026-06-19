import * as THREE from 'three';

export class CameraRig {
  private readonly desiredPosition = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly shakeOffset = new THREE.Vector3();
  private shake = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly offset = new THREE.Vector3(0, 9.5, 9.5),
  ) {}

  snapTo(target: THREE.Vector3): void {
    this.desiredPosition.copy(target).add(this.offset);
    this.camera.position.copy(this.desiredPosition);
    this.lookTarget.copy(target).add(new THREE.Vector3(0, 0.4, 0));
    this.camera.lookAt(this.lookTarget);
  }

  /** brief positional kick for hits / rupture; clamped and quick to ease back */
  impulse(strength: number): void {
    this.shake = Math.min(0.9, this.shake + strength);
  }

  update(delta: number, target: THREE.Vector3, lag: number): void {
    this.desiredPosition.copy(target).add(this.offset);

    this.shake = Math.max(0, this.shake - delta * 2.2);
    if (this.shake > 0) {
      const s = this.shake * this.shake;
      this.shakeOffset.set((Math.random() - 0.5) * s * 2.4, (Math.random() - 0.5) * s * 1.6, (Math.random() - 0.5) * s * 2.4);
      this.desiredPosition.add(this.shakeOffset);
    }

    const factor = 1 - Math.exp(-delta / Math.max(0.001, lag));
    this.camera.position.lerp(this.desiredPosition, factor);
    this.lookTarget.copy(target).add(new THREE.Vector3(0, 0.35, -1.2));
    this.camera.lookAt(this.lookTarget);
  }
}
