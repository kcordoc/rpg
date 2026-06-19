import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Vignette + subtle desaturating edge — a focus pass, not heavy darkness.
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    strength: { value: 0.9 },
    pulse: { value: 0 }, // event-driven red flash (rupture / damage)
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float pulse;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float dist = length(d);
      // chromatic aberration: subtle at the edges, strong during a rupture flash
      float ca = (0.0016 + pulse * 0.01) * dist;
      vec2 dir = normalize(d + 1e-5);
      vec3 color;
      color.r = texture2D(tDiffuse, vUv - dir * ca).r;
      color.g = texture2D(tDiffuse, vUv).g;
      color.b = texture2D(tDiffuse, vUv + dir * ca).b;
      // grade: gentle contrast + saturation for a richer, filmic look
      color = (color - 0.5) * 1.08 + 0.5;
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luma), color, 1.18);
      // vignette
      float vig = smoothstep(0.85, 0.2, dot(d, d) * strength * 2.6);
      color *= mix(0.5, 1.0, vig);
      // damage flash lifts reds toward the edges
      color += vec3(0.7, 0.05, 0.08) * pulse * (1.0 - vig);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// Post is a finishing pass over authored forms. Bloom is tuned (high threshold)
// so it catches only the emissive heroes — core, projectiles, oxidised LDL,
// shear rings — never the matte vessel walls.
export class PostFx {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly vignette: ShaderPass;
  private flash = 0;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, size: THREE.Vector2) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    // half-resolution bloom: most of the cost with little visible loss
    this.bloom = new UnrealBloomPass(size.clone().multiplyScalar(0.5), 0.5, 0.6, 0.9);
    this.composer.addPass(this.bloom);

    this.vignette = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignette);

    this.composer.addPass(new OutputPass());
  }

  /** event-driven red flash for damage / rupture */
  flashDamage(strength = 0.6): void {
    this.flash = Math.min(1, this.flash + strength);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloom.setSize(Math.max(1, width * 0.5), Math.max(1, height * 0.5));
  }

  render(delta: number): void {
    this.flash = Math.max(0, this.flash - delta * 1.8);
    this.vignette.uniforms.pulse.value = this.flash;
    this.composer.render();
  }
}
