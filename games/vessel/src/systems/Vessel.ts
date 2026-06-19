import * as THREE from 'three';
import { RUN } from '../game/content';

// The world: a length of artery seen from just inside the lumen. Blood flows
// along -X. The two banks (walls) are where LDL embeds; as plaque builds, the
// walls visibly close in — that narrowing IS the stenosis the end card reports.
export class Vessel {
  readonly group = new THREE.Group();
  /** foam-cell deposits get parented here so they ride with the wall */
  readonly depositLayer = new THREE.Group();

  private readonly wallNear: THREE.Mesh;
  private readonly wallFar: THREE.Mesh;
  private readonly flowTexture: THREE.CanvasTexture;
  private readonly wallMat: THREE.MeshStandardMaterial;
  private narrowing = 0;
  private readonly baseWallZ = RUN.wallZ;

  constructor(scene: THREE.Scene) {
    scene.background = new THREE.Color('#2a0608');
    scene.fog = new THREE.Fog('#2a0608', 18, 40);

    const hemi = new THREE.HemisphereLight('#ff8f86', '#3a0a0d', 1.4);
    scene.add(hemi);
    const key = new THREE.DirectionalLight('#ffd2c2', 2.1);
    key.position.set(-4, 11, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 36;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    scene.add(key);
    const rim = new THREE.PointLight('#ff5a52', 0.8, 30);
    rim.position.set(6, 4, -6);
    scene.add(rim);

    // Lumen floor (the bloodstream) with a scrolling flow texture.
    this.flowTexture = this.createFlowTexture();
    this.flowTexture.wrapS = THREE.RepeatWrapping;
    this.flowTexture.wrapT = THREE.RepeatWrapping;
    this.flowTexture.repeat.set(6, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(RUN.arena.halfWidth * 2 + 6, RUN.arena.halfDepth * 2 + 6),
      new THREE.MeshStandardMaterial({
        color: '#7a0f16',
        map: this.flowTexture,
        roughness: 0.5,
        metalness: 0.05,
        emissive: '#3a060a',
        emissiveIntensity: 0.5,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    this.group.add(floor);

    // The two artery walls (banks).
    this.wallMat = new THREE.MeshStandardMaterial({
      color: '#b23a3f',
      roughness: 0.85,
      metalness: 0.0,
      emissive: '#3c0d10',
      emissiveIntensity: 0.4,
    });
    const wallGeo = new THREE.BoxGeometry(RUN.arena.halfWidth * 2 + 6, 3.2, 2.4);
    this.wallNear = new THREE.Mesh(wallGeo, this.wallMat);
    this.wallFar = new THREE.Mesh(wallGeo, this.wallMat);
    this.wallNear.receiveShadow = true;
    this.wallFar.receiveShadow = true;
    this.group.add(this.wallNear, this.wallFar);

    // A branch notch — the curiosity cue: plaque starts where flow is disturbed.
    const branchMat = new THREE.MeshStandardMaterial({ color: '#8e2329', roughness: 0.9, emissive: '#2c080a', emissiveIntensity: 0.3 });
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 2.4, 20, 1, true), branchMat);
    branch.rotation.x = Math.PI / 2;
    branch.position.set(1.5, 0.4, this.baseWallZ + 1.4);
    this.group.add(branch);

    this.group.add(this.depositLayer);
    scene.add(this.group);
    this.applyWalls();
  }

  /** wall Z position for the nearest bank a particle can embed on, given a side */
  wallZ(side: 1 | -1): number {
    return side * (this.baseWallZ - this.narrowing);
  }

  /** 0..1 — how closed the lumen is right now */
  setNarrowing(frac: number): void {
    this.narrowing = THREE.MathUtils.clamp(frac, 0, 1) * 3.0;
    this.applyWalls();
  }

  /** 0..100 percent narrowing for reporting */
  narrowingPercent(): number {
    return Math.round((this.narrowing / 3.0) * 100);
  }

  /** flag the wall as inflamed/unstable (visual feedback for danger) */
  setInflammation(frac: number): void {
    const t = THREE.MathUtils.clamp(frac, 0, 1);
    this.wallMat.emissive.setRGB(0.24 + t * 0.55, 0.05, 0.06);
    this.wallMat.emissiveIntensity = 0.4 + t * 0.9;
  }

  update(delta: number): void {
    this.flowTexture.offset.x -= delta * 0.55;
  }

  private applyWalls(): void {
    const z = this.baseWallZ - this.narrowing;
    this.wallNear.position.set(0, 1.0, z + 1.2);
    this.wallFar.position.set(0, 1.0, -(z + 1.2));
  }

  private createFlowTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('flow texture context');
    ctx.fillStyle = '#6c0d14';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 90; i += 1) {
      const y = Math.random() * size;
      const len = 30 + Math.random() * 120;
      const x = Math.random() * size;
      ctx.strokeStyle = `rgba(${200 + Math.random() * 40 | 0}, ${40 + Math.random() * 30 | 0}, ${50 + Math.random() * 30 | 0}, ${0.15 + Math.random() * 0.25})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
