/**
 * Herding Labs — Dot Animation
 * Scattered dots that coalesce toward a card on hover, then drift back.
 * Visual metaphor: herding scattered ideas into focused products.
 */

(function () {
  const CANVAS_ID     = 'dots-bg';
  const DOT_COUNT     = 110;
  const DOT_RADIUS    = 2.2;
  const DOT_COLOR     = 'rgba(45, 45, 45, ';  // charcoal base, alpha appended
  const DOT_ALPHA_REST    = 0.18;
  const DOT_ALPHA_HERDED  = 0.55;
  const DRIFT_SPEED   = 0.18;   // max px/frame when at rest (gentle float)
  const HERD_STRENGTH = 0.085;  // lerp factor toward card center (snappy pull)
  const SCATTER_STRENGTH = 0.04; // lerp back to home when released
  const DRIFT_WANDER  = 0.012;  // random nudge each frame at rest

  let canvas, ctx, W, H;
  let dots = [];
  let herdTarget = null;  // { x, y } in page coords when hovering a card
  let animFrame;

  // ── Dot class ───────────────────────────────────────────────────────────────

  class Dot {
    constructor() {
      this.reset();
      // Start scattered across the full page height (not just viewport)
      this.y = Math.random() * (H * 2);
    }

    reset() {
      // Home position: random across the viewport
      this.homeX = Math.random() * W;
      this.homeY = Math.random() * H;
      this.x = this.homeX + (Math.random() - 0.5) * 60;
      this.y = this.homeY + (Math.random() - 0.5) * 60;
      this.vx = (Math.random() - 0.5) * DRIFT_SPEED;
      this.vy = (Math.random() - 0.5) * DRIFT_SPEED;
      this.alpha = DOT_ALPHA_REST;
      // Stagger each dot's drift phase so they don't all move in sync
      this.phase = Math.random() * Math.PI * 2;
      this.phaseSpeed = 0.003 + Math.random() * 0.007;
    }

    update(scrollY) {
      this.phase += this.phaseSpeed;

      if (herdTarget) {
        // Pull toward herd target (convert page coords to canvas coords)
        const tx = herdTarget.x;
        const ty = herdTarget.y - scrollY;

        this.x += (tx - this.x) * HERD_STRENGTH;
        this.y += (ty - this.y) * HERD_STRENGTH;
        this.alpha += (DOT_ALPHA_HERDED - this.alpha) * 0.08;
      } else {
        // Drift back toward home with gentle sine wander
        const wx = Math.sin(this.phase) * DRIFT_WANDER * W;
        const wy = Math.cos(this.phase * 1.3) * DRIFT_WANDER * H;

        this.x += (this.homeX + wx - this.x) * SCATTER_STRENGTH;
        this.y += (this.homeY + wy - this.y) * SCATTER_STRENGTH;
        this.alpha += (DOT_ALPHA_REST - this.alpha) * 0.06;
      }
    }

    draw(scrollY) {
      // Convert page y to canvas (screen) y
      const screenY = this.y - scrollY;

      // Skip if off screen (performance)
      if (screenY < -20 || screenY > H + 20) return;

      ctx.beginPath();
      ctx.arc(this.x, screenY, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = DOT_COLOR + this.alpha + ')';
      ctx.fill();
    }
  }

  // ── Setup ───────────────────────────────────────────────────────────────────

  function init() {
    canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    spawnDots();
    bindCards();
    loop();

    window.addEventListener('resize', debounce(resize, 150));
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;

    // Reassign home positions on resize
    dots.forEach(d => {
      d.homeX = Math.random() * W;
      d.homeY = Math.random() * H;
    });
  }

  function spawnDots() {
    dots = [];
    for (let i = 0; i < DOT_COUNT; i++) {
      dots.push(new Dot());
    }
  }

  // ── Card hover binding ───────────────────────────────────────────────────────

  function bindCards() {
    const cards = document.querySelectorAll('.app-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        const rect = card.getBoundingClientRect();
        const scrollY = window.scrollY;
        herdTarget = {
          // Center of card in PAGE coordinates
          x: rect.left + rect.width  / 2,
          y: rect.top  + rect.height / 2 + scrollY,
        };
      });

      card.addEventListener('mouseleave', () => {
        herdTarget = null;
      });

      // Touch support (tap = herd, tap away = scatter)
      card.addEventListener('touchstart', (e) => {
        const rect = card.getBoundingClientRect();
        const scrollY = window.scrollY;
        herdTarget = {
          x: rect.left + rect.width  / 2,
          y: rect.top  + rect.height / 2 + scrollY,
        };
      }, { passive: true });
    });

    document.addEventListener('touchstart', (e) => {
      if (!e.target.closest('.app-card')) {
        herdTarget = null;
      }
    }, { passive: true });
  }

  // ── Animation loop ───────────────────────────────────────────────────────────

  function loop() {
    const scrollY = window.scrollY;

    ctx.clearRect(0, 0, W, H);

    dots.forEach(d => {
      d.update(scrollY);
      d.draw(scrollY);
    });

    animFrame = requestAnimationFrame(loop);
  }

  // ── Utils ────────────────────────────────────────────────────────────────────

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
