/* ==========================================================================
   MotionDex — Ambient Particle System
   Floating particles that drift through the entire page, reacting to scroll
   and mouse position. Purely decorative eye-candy.
   ========================================================================== */

const AMBIENT_COUNT = 120;
const canvas = document.createElement('canvas');
canvas.id = 'ambientParticles';
canvas.setAttribute('aria-hidden', 'true');
document.body.prepend(canvas);

const ctx = canvas.getContext('2d');
let W, H;
let scrollY = 0;
let mouseX = -9999, mouseY = -9999;

const palette = [
  [139, 92, 246],   // violet
  [34, 211, 238],   // cyan
  [244, 114, 182],  // pink
  [251, 191, 36],   // amber
];

class Particle {
  constructor() {
    this.reset(true);
  }
  reset(initial = false) {
    this.x = Math.random() * (W || window.innerWidth);
    this.y = initial
      ? Math.random() * (H || window.innerHeight) * 3
      : -10 - Math.random() * 60;
    this.baseX = this.x;
    this.size = 1.2 + Math.random() * 2.5;
    this.speed = 0.15 + Math.random() * 0.35;
    this.drift = (Math.random() - 0.5) * 0.3;
    this.wobbleAmp = 15 + Math.random() * 30;
    this.wobbleSpeed = 0.002 + Math.random() * 0.004;
    this.phase = Math.random() * Math.PI * 2;
    this.alpha = 0.1 + Math.random() * 0.3;
    this.color = palette[Math.floor(Math.random() * palette.length)];
    this.life = 0;
  }
  update(t) {
    this.life++;
    this.y += this.speed;
    this.x = this.baseX + Math.sin(t * this.wobbleSpeed + this.phase) * this.wobbleAmp;
    this.baseX += this.drift;

    // Mouse repulsion
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) {
      const force = (120 - dist) / 120;
      this.x += (dx / dist) * force * 3;
      this.y += (dy / dist) * force * 3;
    }

    if (this.y > H + 20 || this.x < -40 || this.x > W + 40) {
      this.reset();
    }
  }
  draw() {
    const [r, g, b] = this.color;
    // Soft glow
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
    grad.addColorStop(0, `rgba(${r},${g},${b},${this.alpha})`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${this.alpha * 0.4})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Bright core
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${this.alpha * 1.5})`;
    ctx.fill();
  }
}

let particles = [];
let rafId;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * Math.min(devicePixelRatio, 2);
  canvas.height = H * Math.min(devicePixelRatio, 2);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(Math.min(devicePixelRatio, 2), 0, 0, Math.min(devicePixelRatio, 2), 0, 0);
}

function init() {
  resize();
  particles = Array.from({ length: AMBIENT_COUNT }, () => new Particle());
  loop(0);
}

function loop(t) {
  rafId = requestAnimationFrame(loop);
  ctx.clearRect(0, 0, W, H);

  // Draw connecting lines between close particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const alpha = (1 - dist / 100) * 0.06;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  for (const p of particles) {
    p.update(t);
    p.draw();
  }
}

// Events
window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
}, { passive: true });

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
