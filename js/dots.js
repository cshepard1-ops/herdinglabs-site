/**
 * Herding Labs — Dot Animation
 *
 * Dots scatter freely at rest. On card hover they gradually
 * pull toward the card's EDGES (like a magnet) — never going
 * behind the card. The pull ramps up slowly, not a sudden snap.
 * On mouse-leave they drift back to their home positions.
 */

(function () {
  const DOT_COUNT          = 110;
  const DOT_RADIUS         = 2.2;
  const EDGE_BUFFER        = 10;   // px outside card edge where dots gather
  const DOT_ALPHA_REST     = 0.18;
  const DOT_ALPHA_HERDED   = 0.60;

  const HERD_RAMP_FRAMES   = 180;  // frames to reach full pull strength (~3s at 60fps)
  const HERD_STRENGTH_MAX  = 0.055; // lerp factor at full ramp
  const SCATTER_STRENGTH   = 0.035; // lerp back to home
  const DRIFT_WANDER       = 0.011; // gentle sine drift amplitude

  let canvas, ctx, W, H;
  let dots = [];
  let hoverCard = null;   // { left, top, right, bottom } in PAGE coords
  let hoverFrames = 0;    // how many frames we've been hovering

  // ── Nearest point on card perimeter ────────────────────────────────────────
  // Returns a point just OUTSIDE the card edge nearest to (px, py).

  function nearestEdgePoint(px, py, left, top, right, bottom) {
    // Expand rect slightly so dots sit just outside the card face
    const L = left   - EDGE_BUFFER;
    const T = top    - EDGE_BUFFER;
    const R = right  + EDGE_BUFFER;
    const B = bottom + EDGE_BUFFER;

    // Clamp to expanded rect — if outside, this lands ON the expanded edge
    const cx = Math.max(L, Math.min(R, px));
    const cy = Math.max(T, Math.min(B, py));

    // If dot is already outside the expanded rect, the clamped point is the target
    if (px <= L || px >= R || py <= T || py >= B) {
      return { x: cx, y: cy };
    }

    // Dot is INSIDE the expanded rect — push it to the nearest edge
    const dL = px - L;
    const dR = R  - px;
    const dT = py - T;
    const dB = B  - py;
    const m  = Math.min(dL, dR, dT, dB);

    if (m === dL) return { x: L,  y: py };
    if (m === dR) return { x: R,  y: py };
    if (m === dT) return { x: px, y: T  };
    return               { x: px, y: B  };
  }

  // ── Dot ────────────────────────────────────────────────────────────────────

  class Dot {
    constructor() {
      this.homeX = Math.random() * W;
      this.homeY = Math.random() * H;
      this.x     = this.homeX + (Math.random() - 0.5) * 80;
      this.y     = this.homeY + (Math.random() - 0.5) * 80;
      this.phase      = Math.random() * Math.PI * 2;
      this.phaseSpeed = 0.004 + Math.random() * 0.006;
      this.alpha      = DOT_ALPHA_REST;
    }

    update(scrollY) {
      this.phase += this.phaseSpeed;

      if (hoverCard) {
        // Ramp up pull strength over HERD_RAMP_FRAMES
        const t = Math.min(hoverFrames / HERD_RAMP_FRAMES, 1);
        // Ease-in curve: t² makes it start slow and accelerate
        const strength = HERD_STRENGTH_MAX * t * t;

        // Target = nearest point on card edge (in page coords → canvas coords)
        const { x: tx, y: ty } = nearestEdgePoint(
          this.x,
          this.y + scrollY,
          hoverCard.left,
          hoverCard.top,
          hoverCard.right,
          hoverCard.bottom
        );

        // ty is in page coords, convert to canvas (screen) coords for movement
        const screenTY = ty - scrollY;

        this.x += (tx      - this.x) * strength;
        this.y += (screenTY - this.y) * strength;
        this.alpha += (DOT_ALPHA_HERDED - this.alpha) * 0.04;

      } else {
        // Drift back to home with gentle sine wander
        const wx = Math.sin(this.phase)        * DRIFT_WANDER * W;
        const wy = Math.cos(this.phase * 1.3)  * DRIFT_WANDER * H;

        this.x += (this.homeX + wx - this.x) * SCATTER_STRENGTH;
        this.y += (this.homeY + wy - this.y) * SCATTER_STRENGTH;
        this.alpha += (DOT_ALPHA_REST - this.alpha) * 0.05;
      }
    }

    draw(scrollY) {
      const screenY = this.y;  // already in canvas coords
      if (screenY < -20 || screenY > H + 20) return;

      ctx.beginPath();
      ctx.arc(this.x, screenY, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(45,45,45,${this.alpha})`;
      ctx.fill();
    }
  }

  // ── Card hover ─────────────────────────────────────────────────────────────

  function bindCards() {
    document.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        const rect = card.getBoundingClientRect();
        const sy   = window.scrollY;
        hoverCard = {
          left:   rect.left,
          top:    rect.top  + sy,
          right:  rect.right,
          bottom: rect.bottom + sy,
        };
        hoverFrames = 0;
      });

      card.addEventListener('mouseleave', () => {
        hoverCard   = null;
        hoverFrames = 0;
      });
    });
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    dots.forEach(d => {
      d.homeX = Math.random() * W;
      d.homeY = Math.random() * H;
    });
  }

  // ── Loop ───────────────────────────────────────────────────────────────────

  function loop() {
    const scrollY = window.scrollY;
    if (hoverCard) hoverFrames++;

    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.update(scrollY);
      d.draw(scrollY);
    });

    requestAnimationFrame(loop);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    canvas = document.getElementById('dots-bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;

    for (let i = 0; i < DOT_COUNT; i++) dots.push(new Dot());

    bindCards();
    window.addEventListener('resize', debounce(resize, 150));
    loop();
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
