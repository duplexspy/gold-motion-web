/**
 * Gold Motion Cubic Bezier Graph Editor
 * Implements GmGraphUi & GmFrame for interactive keyframe easing manipulation
 */

export class GraphEditor {
  constructor(container, onCurveChange = null) {
    this.container = container;
    this.onCurveChange = onCurveChange;

    // Cubic Bezier control points: P1 (x1, y1), P2 (x2, y2)
    this.p1 = { x: 0.42, y: 0.0 };
    this.p2 = { x: 0.58, y: 1.0 };

    this.activeHandle = null;
    this.canvas = null;
    this.ctx = null;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div id="gmGraphModal" class="gm-modal-scrim">
        <div class="gm-modal-card" style="max-width: 460px;">
          <div class="gm-modal-header">
            <h3>📈 Keyframe Graph Editor</h3>
            <button class="gm-btn gm-btn-icon" id="gmGraphClose">✕</button>
          </div>
          <div class="gm-modal-body">
            <div style="position: relative; width: 100%; height: 240px; background: #0c0e14; border: 1px solid var(--gm-border-subtle); border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              <canvas id="gmGraphCanvas" width="380" height="220"></canvas>
            </div>

            <div class="gm-prop-title" style="margin-top: 4px;">Curve Presets</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;" id="gmGraphPresets">
              <button class="gm-btn" data-curve="0.42 0.0 1.0 1.0">Ease In</button>
              <button class="gm-btn" data-curve="0.0 0.0 0.58 1.0">Ease Out</button>
              <button class="gm-btn gm-btn-gold" data-curve="0.42 0.0 0.58 1.0">Ease In-Out</button>
              <button class="gm-btn" data-curve="0.0 0.0 1.0 1.0">Linear</button>
              <button class="gm-btn" data-curve="0.17 0.89 0.32 1.28">Bounce</button>
              <button class="gm-btn" data-curve="0.68 -0.55 0.27 1.55">Elastic</button>
            </div>

            <div class="gm-prop-row" style="margin-top: 8px;">
              <span class="gm-prop-label">Bezier Parameters</span>
              <span id="gmCurveParams" style="color: var(--gm-gold-primary); font-family: monospace; font-size: 11.5px; font-weight: 700;">cubicBezier 0.42 0.0 0.58 1.0</span>
            </div>
          </div>
          <div class="gm-modal-footer">
            <button class="gm-btn" id="gmGraphCancel">Cancel</button>
            <button class="gm-btn gm-btn-gold" id="gmGraphApply">Apply Curve</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#gmGraphCanvas');
    this.ctx = this.canvas.getContext('2d');

    const modal = this.container.querySelector('#gmGraphModal');
    const closeBtn = this.container.querySelector('#gmGraphClose');
    const cancelBtn = this.container.querySelector('#gmGraphCancel');
    const applyBtn = this.container.querySelector('#gmGraphApply');

    const close = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);

    // Preset buttons
    this.container.querySelectorAll('#gmGraphPresets button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('#gmGraphPresets button').forEach(b => b.classList.remove('gm-btn-gold'));
        btn.classList.add('gm-btn-gold');
        const [x1, y1, x2, y2] = btn.dataset.curve.split(' ').map(Number);
        this.p1 = { x: x1, y: y1 };
        this.p2 = { x: x2, y: y2 };
        this.draw();
        this.updateParamDisplay();
      });
    });

    applyBtn?.addEventListener('click', () => {
      const easingStr = `cubicBezier ${this.p1.x.toFixed(3)} ${this.p1.y.toFixed(3)} ${this.p2.x.toFixed(3)} ${this.p2.y.toFixed(3)}`;
      if (this.onCurveChange) this.onCurveChange(easingStr);
      close();
    });

    this.setupInteractivity();
    this.draw();
  }

  setupInteractivity() {
    const canvas = this.canvas;
    const padding = 35;

    const toScreen = (pt) => ({
      x: padding + pt.x * (canvas.width - padding * 2),
      y: (canvas.height - padding) - pt.y * (canvas.height - padding * 2)
    });

    const toNorm = (sx, sy) => ({
      x: Math.max(0, Math.min(1, (sx - padding) / (canvas.width - padding * 2))),
      y: ((canvas.height - padding) - sy) / (canvas.height - padding * 2)
    });

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const s1 = toScreen(this.p1);
      const s2 = toScreen(this.p2);

      const d1 = Math.hypot(mx - s1.x, my - s1.y);
      const d2 = Math.hypot(mx - s2.x, my - s2.y);

      if (d1 < 16) {
        this.activeHandle = 'p1';
      } else if (d2 < 16) {
        this.activeHandle = 'p2';
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.activeHandle) return;
      const rect = canvas.getBoundingClientRect();
      const norm = toNorm(e.clientX - rect.left, e.clientY - rect.top);

      if (this.activeHandle === 'p1') {
        this.p1 = norm;
      } else if (this.activeHandle === 'p2') {
        this.p2 = norm;
      }

      this.draw();
      this.updateParamDisplay();
    });

    window.addEventListener('pointerup', () => this.activeHandle = null);
  }

  updateParamDisplay() {
    const el = this.container.querySelector('#gmCurveParams');
    if (el) {
      el.textContent = `cubicBezier ${this.p1.x.toFixed(2)} ${this.p1.y.toFixed(2)} ${this.p2.x.toFixed(2)} ${this.p2.y.toFixed(2)}`;
    }
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pad = 35;

    ctx.clearRect(0, 0, w, h);

    const toScreen = (x, y) => ({
      x: pad + x * (w - pad * 2),
      y: (h - pad) - y * (h - pad * 2)
    });

    const start = toScreen(0, 0);
    const end = toScreen(1, 1);
    const h1 = toScreen(this.p1.x, this.p1.y);
    const h2 = toScreen(this.p2.x, this.p2.y);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    // Diagonal base line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tangent handle lines
    ctx.strokeStyle = 'rgba(246, 201, 69, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(h1.x, h1.y);
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(h2.x, h2.y);
    ctx.stroke();

    // The Bezier Curve
    ctx.strokeStyle = '#f6c945';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(h1.x, h1.y, h2.x, h2.y, end.x, end.y);
    ctx.stroke();

    // Control point handles
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#f6c945';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(h1.x, h1.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(h2.x, h2.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  open(currentEasing = 'cubicBezier 0.42 0.0 0.58 1.0') {
    if (currentEasing.startsWith('cubicBezier')) {
      const parts = currentEasing.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 4) {
        this.p1 = { x: parts[0], y: parts[1] };
        this.p2 = { x: parts[2], y: parts[3] };
      }
    }
    this.draw();
    this.updateParamDisplay();
    const modal = this.container.querySelector('#gmGraphModal');
    if (modal) modal.classList.add('active');
  }
}
