import * as THREE from 'three';
import { RUN } from '../game/content';

const TUBE_RADIUS = 13;
const TUBE_CY = 11.8; // centre height so we sit in the lower lumen
const TUBE_LENGTH = 66;

// The world: the inside of a living blood vessel. One large organic tube (seen
// from within), endothelial walls with displacement, plaque ridges that grow
// along the banks, drifting plasma motes, and a heartbeat that drives the flow.
// Authored geometry — not a flat plane with fog over it.
export class Vessel {
  readonly group = new THREE.Group();
  readonly depositLayer = new THREE.Group();

  private readonly wallMat: THREE.MeshStandardMaterial;
  private readonly flowTexture: THREE.CanvasTexture;
  private readonly ridgeNear: THREE.Mesh;
  private readonly ridgeFar: THREE.Mesh;
  private readonly motes: THREE.Sprite[] = [];
  private readonly beatLight: THREE.PointLight;
  private narrowing = 0;
  private inflammation = 0;
  private clock = 0;
  private readonly baseWallZ = RUN.wallZ;

  constructor(scene: THREE.Scene) {
    scene.background = new THREE.Color('#1c0305');
    scene.fog = new THREE.Fog('#240407', 16, 46);

    // ---- lighting stack: key / fill / rim + a pulsing practical ----
    const hemi = new THREE.HemisphereLight('#ff9a8c', '#260406', 1.1);
    scene.add(hemi);
    const key = new THREE.DirectionalLight('#ffd9c8', 1.9);
    key.position.set(-5, 13, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -18;
    key.shadow.camera.right = 18;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    scene.add(key);
    const rim = new THREE.DirectionalLight('#ff5a66', 0.8);
    rim.position.set(6, 4, -10);
    scene.add(rim);
    this.beatLight = new THREE.PointLight('#ff6b6b', 0.6, 44, 1.6);
    this.beatLight.position.set(0, 6, 0);
    scene.add(this.beatLight);

    // ---- endothelial tube ----
    this.wallMat = new THREE.MeshStandardMaterial({
      color: '#9c2b30',
      map: this.createWallTexture(),
      roughness: 0.82,
      metalness: 0.0,
      emissive: '#48070c',
      emissiveIntensity: 0.5,
      side: THREE.BackSide,
    });
    const tubeGeo = new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 30, 40, true);
    this.displace(tubeGeo, 0.55);
    tubeGeo.rotateZ(Math.PI / 2); // axis along X
    const tube = new THREE.Mesh(tubeGeo, this.wallMat);
    tube.position.y = TUBE_CY;
    tube.receiveShadow = true;
    this.group.add(tube);

    // ---- plaque ridges along both banks (the visible stenosis) ----
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: '#c9a23e',
      roughness: 0.95,
      metalness: 0.0,
      emissive: '#3a2c08',
      emissiveIntensity: 0.25,
    });
    const ridgeGeo = new THREE.CylinderGeometry(0.9, 1.25, RUN.arena.halfWidth * 2 + 8, 7, 24);
    this.displace(ridgeGeo, 0.28);
    ridgeGeo.rotateZ(Math.PI / 2);
    this.ridgeNear = new THREE.Mesh(ridgeGeo, ridgeMat);
    this.ridgeFar = new THREE.Mesh(ridgeGeo, ridgeMat);
    this.ridgeNear.receiveShadow = true;
    this.ridgeFar.receiveShadow = true;
    this.group.add(this.ridgeNear, this.ridgeFar);

    // ---- a branching side-vessel: the curiosity cue (plaque starts at branches) ----
    const branchGeo = new THREE.CylinderGeometry(2.4, 3.0, 9, 28, 6, true);
    this.displace(branchGeo, 0.4);
    const branchMat = new THREE.MeshStandardMaterial({ color: '#7e2026', roughness: 0.85, emissive: '#360609', emissiveIntensity: 0.4, side: THREE.BackSide });
    const branch = new THREE.Mesh(branchGeo, branchMat);
    branch.rotation.x = -Math.PI / 3.2;
    branch.position.set(2.5, 2.2, this.baseWallZ + 3.5);
    this.group.add(branch);

    // ---- drifting plasma motes (foreground depth + motion) ----
    this.createMotes();

    this.group.add(this.depositLayer);
    scene.add(this.group);

    this.flowTexture = this.wallMat.map as THREE.CanvasTexture;
    this.applyRidges();
  }

  wallZ(side: 1 | -1): number {
    return side * (this.baseWallZ - this.narrowing * 1.4);
  }

  setNarrowing(frac: number): void {
    this.narrowing = THREE.MathUtils.clamp(frac, 0, 1);
    this.applyRidges();
  }

  narrowingPercent(): number {
    return Math.round(this.narrowing * 100);
  }

  setInflammation(frac: number): void {
    this.inflammation = THREE.MathUtils.clamp(frac, 0, 1);
  }

  update(delta: number): void {
    this.clock += delta;
    // heartbeat: a sharp systolic surge then decay, ~once per second
    const beatPhase = (this.clock * 1.1) % 1;
    const beat = Math.exp(-beatPhase * 6) + 0.25 * Math.exp(-((beatPhase - 0.18) ** 2) * 60);

    this.flowTexture.offset.x -= delta * (0.5 + beat * 0.7);
    this.beatLight.intensity = 0.45 + beat * 1.1;

    const inflame = this.inflammation;
    this.wallMat.emissive.setRGB(0.28 + inflame * 0.5, 0.05 + beat * 0.04, 0.06);
    this.wallMat.emissiveIntensity = 0.45 + beat * 0.35 + inflame * 0.6;

    // drift motes downstream and recycle
    for (const mote of this.motes) {
      mote.position.x -= delta * (3 + beat * 3);
      if (mote.position.x < -TUBE_LENGTH / 2) this.recycleMote(mote);
    }
  }

  dispose(): void {
    this.flowTexture.dispose();
  }

  private applyRidges(): void {
    const z = this.baseWallZ + 0.6;
    const height = 0.5 + this.narrowing * 2.4;
    const spread = 1 + this.narrowing * 1.2;
    this.ridgeNear.position.set(0, 0.0, z - this.narrowing * 1.2);
    this.ridgeFar.position.set(0, 0.0, -(z - this.narrowing * 1.2));
    this.ridgeNear.scale.set(1, height, spread);
    this.ridgeFar.scale.set(1, height, spread);
  }

  private createMotes(): void {
    const tex = this.createMoteTexture();
    const mat = new THREE.SpriteMaterial({ map: tex, color: '#c8323a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 70; i += 1) {
      const mote = new THREE.Sprite(mat.clone());
      this.placeMote(mote, true);
      this.group.add(mote);
      this.motes.push(mote);
    }
  }

  private placeMote(mote: THREE.Sprite, anywhere: boolean): void {
    const angle = Math.random() * Math.PI * 2;
    const r = (0.3 + Math.random() * 0.7) * (TUBE_RADIUS - 3);
    mote.position.set(
      anywhere ? (Math.random() - 0.5) * TUBE_LENGTH : TUBE_LENGTH / 2,
      TUBE_CY + Math.sin(angle) * r * 0.5 - 4,
      Math.cos(angle) * r,
    );
    const s = 0.4 + Math.random() * 1.1;
    mote.scale.setScalar(s);
  }

  private recycleMote(mote: THREE.Sprite): void {
    this.placeMote(mote, false);
  }

  private displace(geo: THREE.BufferGeometry, amount: number): void {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      const n =
        Math.sin(v.x * 1.3 + v.y * 0.7) * 0.5 +
        Math.cos(v.y * 1.1 + v.z * 1.4) * 0.3 +
        Math.sin(v.z * 1.7 + v.x * 0.9) * 0.2;
      const dir = v.clone().normalize();
      v.addScaledVector(dir, n * amount);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
  }

  private createWallTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('wall texture context');
    ctx.fillStyle = '#7e1e24';
    ctx.fillRect(0, 0, size, size);
    // mottled endothelial cells
    for (let i = 0; i < 520; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 8 + Math.random() * 28;
      const shade = 110 + Math.random() * 70;
      ctx.fillStyle = `rgba(${shade}, ${24 + Math.random() * 20}, ${28 + Math.random() * 18}, ${0.12 + Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // faint vessels / striations
    ctx.strokeStyle = 'rgba(60, 8, 12, 0.4)';
    for (let i = 0; i < 40; i += 1) {
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      const y = Math.random() * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 60, size * 0.6, y + (Math.random() - 0.5) * 60, size, y + (Math.random() - 0.5) * 40);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 3);
    return tex;
  }

  private createMoteTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('mote texture context');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, '#ff8a8a');
    grad.addColorStop(0.5, '#c8323a88');
    grad.addColorStop(1, '#00000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
