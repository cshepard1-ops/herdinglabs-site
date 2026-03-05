/**
 * Herding Labs — Dot Animation
 *
 * Dots scatter at rest. On card hover they pull toward the card edges —
 * half-covered by the card, spreading out like a flock pressed against
 * a fence. They push each other apart so they never stack.
 */

(function () {
  const DOT_COUNT         = 110;
  const DOT_RADIUS        = 2.5;
  const EDGE_BUFFER       = 0;    // 0 = dots sit right on card edge, half covered
  const DOT_ALPHA_REST    = 0.18;
  const DOT_ALPHA_HERDED  = 0.65;

  // Same speed in as out
  const HERD_STRENGTH     = 0.038;
  const SCATTER_STRENGTH  = 0.038;
  const DRIFT_WANDER      = 0.011;

  // Repulsion: keep dots from stacking on top of each other
  const MIN_DIST          = DOT_RADIUS * 2 + 3.5;  // minimum center-to-center px
  const REPULSION_FORCE   = 0.45;

  let canvas, ctx, W, H;
  let dots      = [];
  let hoverCard = null;  // { left, top, right, bottom } in PAGE coords

  // ── Nearest point on card edge ─────────────────────────────────────────────
  // Returns the nearest point on the card's border (+ EDGE_BUFFER outside).
  // EDGE_BUFFER=0 means dot center lands exactly on the card border line.

  function nearestEdgePoint(px, py, L, T, R, B) {
    // Expand (or contract) by EDGE_BUFFER
    const el = L - EDGE_BUFFER;
    const et = T - EDGE_BUFFER;
    const er = R + EDGE_BUFFER;
    const eb = B + EDGE_BUFFER;

    // If dot is outside the expanded rect, clamp puts it on the nearest edge
    if (px < el || px > er || py < et || py > eb) {
      return {
        x: Math.max(el, Math.min(er, px)),
        y: Math.max(et, Math.min(eb, py)),
      };
    }

    // Dot is inside — push it to nearest wall of the expanded rect
    const dL = px - el, dR = er - px, dT = py - et, dB = eb - py;
    const m  = Math.min(dL, dR, dT, dB);
    if (m === dL) return { x: el, y: py };
    if (m === dR) return { x: er, y: py };
    if (m === dT) return { x: px, y: et };
    return               { x: px, y: eb };
  }

  // ── Dot ────────────────────────────────────────────────────────────────────

  class Dot {
    constructor() {
      this.homeX      = Math.random() * W;
      this.homeY      = Math.random() * H;
      this.x          = this.homeX + (Math.random() - 0.5) * 80;
      this.y          = this.homeY + (Math.random() - 0.5) * 80;
      this.phase      = Math.random() * Math.PI * 2;
      this.phaseSpeed = 0.004 + Math.random() * 0.006;
      this.alpha      = DOT_ALPHA_REST;
    }

    update(scrollY) {
      this.phase += this.phaseSpeed;

      if (hoverCard) {
        // Find nearest point on card edge (page coords → convert y for canvas)
        const { x: tx, y: ty } = nearestEdgePoint(
          this.x,
          this.y + scrollY,       // dot in page coords
          hoverCard.left,
          hoverCard.top,
          hoverCard.right,
          hoverCard.bottom
        );

        this.x += (tx            - this.x) * HERD_STRENGTH;
        this.y += ((ty - scrollY) - this.y) * HERD_STRENGTH;
        this.alpha += (DOT_ALPHA_HERDED - this.alpha) * 0.07;

      } else {
        // Drift back to home with gentle sine wander
        const wx = Math.sin(this.phase)       * DRIFT_WANDER * W;
        const wy = Math.cos(this.phase * 1.3) * DRIFT_WANDER * H;

        this.x += (this.homeX + wx - this.x) * SCATTER_STRENGTH;
        this.y += (this.homeY + wy - this.y) * SCATTER_STRENGTH;
        this.alpha += (DOT_ALPHA_REST - this.alpha) * 0.05;
      }
    }

    draw() {
      if (this.y < -20 || this.y > H + 20) return;
      ctx.beginPath();
      ctx.arc(this.x, this.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(45,45,45,${this.alpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  // ── Repulsion pass — spreads dots along the edge like a flock ──────────────
  // Runs AFTER all dots have moved toward edge. Pushes overlapping dots apart
  // so they self-distribute (no stacking, no piling into one point).

  function applyRepulsion() {
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a  = dots[i];
        const b  = dots[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < MIN_DIST * MIN_DIST && d2 > 0.0001) {
          const d     = Math.sqrt(d2);
          const push  = (MIN_DIST - d) / d * REPULSION_FORCE;
          const nx    = dx * push;
          const ny    = dy * push;
          a.x += nx;  a.y += ny;
          b.x -= nx;  b.y -= ny;
        }
      }
    }
  }

  // ── Card hover ─────────────────────────────────────────────────────────────

  function bindCards() {
    document.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        const r  = card.getBoundingClientRect();
        const sy = window.scrollY;
        hoverCard = {
          left:   r.left,
          top:    r.top  + sy,
          right:  r.right,
          bottom: r.bottom + sy,
        };
      });
      card.addEventListener('mouseleave', () => { hoverCard = null; });
    });
  }

  // ── Loop ───────────────────────────────────────────────────────────────────

  function loop() {
    const scrollY = window.scrollY;

    ctx.clearRect(0, 0, W, H);

    dots.forEach(d => d.update(scrollY));
    if (hoverCard) applyRepulsion();
    dots.forEach(d => d.draw());

    requestAnimationFrame(loop);
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

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    canvas = document.getElementById('dots-bg');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    W   = canvas.width  = window.innerWidth;
    H   = canvas.height = window.innerHeight;

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
