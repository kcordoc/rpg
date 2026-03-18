/**
 * AmbientParticles — creates and manages ambient particle effects in the Overworld.
 *
 * Driven entirely by theme config. Supports:
 * - fireflies: glowing dots that drift randomly
 * - stars: twinkling points that fade in/out
 *
 * Usage:
 *   const ambient = new AmbientParticles(scene);
 *   ambient.start(themeConfig.particles);  // from themeConfig
 *   ambient.stop();                         // on theme change or scene shutdown
 */

export class AmbientParticles {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];      // Active particle game objects
    this.timers = [];          // Scheduled events
    this._active = false;
    this._config = null;
  }

  /** Start emitting particles based on theme particle config */
  start(particleConfig) {
    this.stop(); // Clean up any existing particles
    if (!particleConfig) return;

    this._config = particleConfig;
    this._active = true;

    const { type, count, config } = particleConfig;

    // Create particle textures (procedural — no asset files needed)
    this._ensureTextures(config);

    // Spawn initial batch
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(Math.random() * 2000, () => {
        if (this._active) this._spawnParticle(type, config);
      });
    }

    // Continuously respawn to maintain count
    const respawnTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this._active) return;
        // Remove dead particles
        this.particles = this.particles.filter(p => p.active);
        // Spawn more if below count
        const deficit = count - this.particles.length;
        for (let i = 0; i < Math.min(deficit, 3); i++) {
          this._spawnParticle(type, config);
        }
      },
      loop: true,
    });
    this.timers.push(respawnTimer);
  }

  /** Stop and clean up all particles */
  stop() {
    this._active = false;
    this._config = null;
    for (const p of this.particles) {
      if (p && p.active) p.destroy();
    }
    this.particles = [];
    for (const t of this.timers) {
      if (t) t.remove(false);
    }
    this.timers = [];
  }

  /** Create procedural circle textures for particles */
  _ensureTextures(config) {
    const key = 'ambient-particle';
    if (this.scene.textures.exists(key)) return;

    const size = (config.maxSize || 4) * 2 + 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const r = size / 2;
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Add glow if specified
    if (config.glow) {
      const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }

    this.scene.textures.addCanvas(key, canvas);
  }

  /** Spawn a single particle */
  _spawnParticle(type, config) {
    if (!this._active || !this.scene || this.scene.sys?.isDestroyed) return;

    const cam = this.scene.cameras.main;
    if (!cam) return;

    // Spawn within the visible camera area (with some padding)
    const pad = 50;
    const x = cam.scrollX - pad + Math.random() * (cam.width / cam.zoom + pad * 2);
    const y = cam.scrollY - pad + Math.random() * (cam.height / cam.zoom + pad * 2);

    const color = config.colors[Math.floor(Math.random() * config.colors.length)];
    const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
    const alpha = config.minAlpha + Math.random() * (config.maxAlpha - config.minAlpha);
    const lifespan = config.minLifespan + Math.random() * (config.maxLifespan - config.minLifespan);

    const particle = this.scene.add.image(x, y, 'ambient-particle');
    particle.setScale(size / ((config.maxSize || 4) * 2 + 2));
    particle.setTint(color);
    particle.setAlpha(0);
    particle.setDepth(15); // Above player, below UI
    // Don't scroll with camera - particles exist in world space but we want them
    // visible in camera space for ambient effect
    particle.setScrollFactor(0);

    this.particles.push(particle);

    // Animate: fade in, optionally drift, then fade out and destroy
    const fadeInDuration = 500 + Math.random() * 500;
    const fadeOutDuration = 500 + Math.random() * 500;
    const holdDuration = lifespan - fadeInDuration - fadeOutDuration;

    // Fade in
    this.scene.tweens.add({
      targets: particle,
      alpha: alpha,
      duration: fadeInDuration,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this._active || !particle.active) return;

        // Twinkle effect for star type
        if (config.twinkle && type === 'stars') {
          this.scene.tweens.add({
            targets: particle,
            alpha: { from: alpha, to: alpha * 0.3 },
            duration: 800 + Math.random() * 1200,
            yoyo: true,
            repeat: Math.floor(holdDuration / 2000),
            ease: 'Sine.easeInOut',
          });
        }

        // Drift for firefly type
        if (config.drift && type === 'fireflies') {
          const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
          const angle = Math.random() * Math.PI * 2;
          this.scene.tweens.add({
            targets: particle,
            x: particle.x + Math.cos(angle) * speed * (holdDuration / 1000),
            y: particle.y + Math.sin(angle) * speed * (holdDuration / 1000),
            duration: holdDuration,
            ease: 'Sine.easeInOut',
          });
        }

        // Fade out after hold
        this.scene.time.delayedCall(Math.max(100, holdDuration), () => {
          if (!particle.active) return;
          this.scene.tweens.add({
            targets: particle,
            alpha: 0,
            duration: fadeOutDuration,
            ease: 'Sine.easeOut',
            onComplete: () => {
              if (particle.active) particle.destroy();
            }
          });
        });
      }
    });
  }
}
