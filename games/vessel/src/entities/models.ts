import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Authored geometry factories. Each returns a single merged BufferGeometry so a
// detailed silhouette costs one draw call per instance — readable forms without
// a primitive-stack look (or a perf cliff with ~90 enemies on screen).

/**
 * LDL particle: a lipid globule (clustered droplet) wrapped by an ApoB protein
 * strand. One mesh, so it can be tinted per-instance as it oxidises.
 */
export function makeLdlGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.IcosahedronGeometry(0.32, 1);
  parts.push(body);
  // a few fatty lobes for an irregular, organic droplet silhouette
  const lobeDefs: Array<[number, number, number, number]> = [
    [0.26, 0.1, 0.1, 0.2],
    [-0.18, -0.2, 0.14, 0.17],
    [0.05, 0.22, -0.2, 0.15],
  ];
  for (const [x, y, z, r] of lobeDefs) {
    const lobe = new THREE.IcosahedronGeometry(r, 1);
    lobe.translate(x, y, z);
    parts.push(lobe);
  }
  // ApoB strand wrapping the droplet (torus is indexed; the icosahedra are not,
  // so convert it to non-indexed for a clean merge)
  const strandIndexed = new THREE.TorusGeometry(0.36, 0.05, 6, 18);
  strandIndexed.rotateX(Math.PI / 2.4);
  const strand = strandIndexed.toNonIndexed();
  strandIndexed.dispose();
  parts.push(strand);
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  merged.computeVertexNormals();
  return merged;
}

/**
 * Foam cell / embedded plaque: a lumpy calcified deposit. Vertices are pushed
 * out by value noise so each one is a unique irregular blob.
 */
export function makeFoamGeometry(seed = 1): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.46, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const n =
      Math.sin(v.x * 7 + seed) * 0.5 +
      Math.cos(v.y * 9 + seed * 1.7) * 0.3 +
      Math.sin(v.z * 11 + seed * 2.3) * 0.2;
    const scale = 1 + n * 0.22;
    v.multiplyScalar(scale);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A soft additive glow sprite for cores, used to push bloom on hero elements. */
export function makeGlowTexture(color = '#9ffff0'): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('glow texture context');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color + 'aa');
  grad.addColorStop(1, '#00000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
