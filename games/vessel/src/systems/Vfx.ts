import * as THREE from 'three';
import { makeGlowTexture } from '../entities/models';

interface Particle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  alive: boolean;
}

// Pooled additive particle bursts for event feedback: a teal shard-pop when an
// LDL is cleared, an angry amber puff when one embeds. Cheap, reused sprites.
export class Vfx {
  private readonly pool: Particle[] = [];
  private readonly tex: THREE.CanvasTexture;
  private readonly baseMat: THREE.SpriteMaterial;

  constructor(private readonly scene: THREE.Scene) {
    this.tex = makeGlowTexture('#ffffff');
    this.baseMat = new THREE.SpriteMaterial({
      map: this.tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  burst(position: THREE.Vector3, color: THREE.ColorRepresentation, count: number, speed = 4, life = 0.45): void {
    for (let i = 0; i < count; i += 1) {
      const p = this.pool.find((q) => !q.alive) ?? this.spawn();
      p.alive = true;
      p.sprite.visible = true;
      p.sprite.position.copy(position);
      (p.sprite.material as THREE.SpriteMaterial).color.set(color);
      const a = Math.random() * Math.PI * 2;
      const up = 0.3 + Math.random() * 0.8;
      p.vel.set(Math.cos(a), up, Math.sin(a)).multiplyScalar(speed * (0.5 + Math.random()));
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.life = p.maxLife;
      p.size = 0.4 + Math.random() * 0.5;
    }
  }

  update(delta: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= delta;
      if (p.life <= 0) {
        p.alive = false;
        p.sprite.visible = false;
        continue;
      }
      p.vel.y -= delta * 4; // gentle gravity
      p.sprite.position.addScaledVector(p.vel, delta);
      const t = p.life / p.maxLife;
      const s = p.size * t;
      p.sprite.scale.set(s, s, s);
      (p.sprite.material as THREE.SpriteMaterial).opacity = t;
    }
  }

  dispose(): void {
    for (const p of this.pool) this.scene.remove(p.sprite);
    this.pool.length = 0;
    this.tex.dispose();
    this.baseMat.dispose();
  }

  private spawn(): Particle {
    const sprite = new THREE.Sprite(this.baseMat.clone());
    sprite.scale.setScalar(0.4);
    this.scene.add(sprite);
    const p: Particle = { sprite, vel: new THREE.Vector3(), life: 0, maxLife: 0, size: 0.4, alive: false };
    this.pool.push(p);
    return p;
  }
}
