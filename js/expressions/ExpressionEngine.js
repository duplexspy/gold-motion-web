/**
 * Gold Motion Expression Engine & Dialog
 * Implements com.goldmotion.expression.ExpressionEngine & ExpressionDialog
 */

export class ExpressionEngine {
  /**
   * Evaluates expression string for a layer at time `t` (in seconds)
   */
  static evaluate(code, time, baseValue = 0, options = {}) {
    if (!code || typeof code !== 'string') return baseValue;

    // Helper functions inside expression scope
    const wiggle = (freq, amp) => {
      const f = parseFloat(freq) || 5;
      const a = parseFloat(amp) || 25;
      // Multi-sine pseudo-noise
      return (Math.sin(time * f * 2.1) + Math.sin(time * f * 3.7 + 1.2) + Math.sin(time * f * 5.3 + 2.4)) * (a / 3);
    };

    const bounce = (amp, freq, decay) => {
      const a = parseFloat(amp) || 50;
      const f = parseFloat(freq) || 4;
      const d = parseFloat(decay) || 3;
      return a * Math.exp(-d * time) * Math.cos(2 * Math.PI * f * time);
    };

    const inertia = (amp, decay) => {
      const a = parseFloat(amp) || 100;
      const d = parseFloat(decay) || 2;
      return a * Math.exp(-d * time);
    };

    const pulse = (amp, speed) => {
      const a = parseFloat(amp) || 30;
      const s = parseFloat(speed) || 3;
      return Math.abs(Math.sin(time * s)) * a;
    };

    try {
      const scope = {
        time,
        value: baseValue,
        wiggle,
        bounce,
        inertia,
        pulse,
        Math,
        ...options
      };

      const fn = new Function(...Object.keys(scope), `return (${code});`);
      return fn(...Object.values(scope));
    } catch (e) {
      console.warn('[ExpressionEngine] Evaluation error:', e);
      return baseValue;
    }
  }

  /**
   * Bakes an expression into keyframes across layer duration
   */
  static bakeKeyframes(layer, property, code, fps = 30) {
    if (!layer) return [];
    const durationSec = (layer.endTime - layer.startTime) / 1000;
    const totalFrames = Math.floor(durationSec * fps);
    const keyframes = [];

    for (let f = 0; f <= totalFrames; f++) {
      const tSec = f / fps;
      const normT = totalFrames > 0 ? f / totalFrames : 0;
      const val = this.evaluate(code, tSec, 0);

      keyframes.push({
        t: normT,
        v: val,
        e: 'linear'
      });
    }

    if (!layer.transform.keyframes) layer.transform.keyframes = {};
    layer.transform.keyframes[property] = keyframes;
    return keyframes;
  }
}

export class ExpressionDialog {
  constructor(container, onApply = null) {
    this.container = container;
    this.onApply = onApply;
    this.currentLayer = null;
    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div id="gmExprModal" class="gm-modal-scrim">
        <div class="gm-modal-card">
          <div class="gm-modal-header">
            <h3>⚡ Expression Editor</h3>
            <button class="gm-btn gm-btn-icon" id="gmExprClose">✕</button>
          </div>
          <div class="gm-modal-body">
            <div class="gm-prop-row">
              <span class="gm-prop-label">Target Property</span>
              <select class="gm-prop-input" id="gmExprProp" style="width: 170px;">
                <option value="location">Position X / Y</option>
                <option value="scale">Scale (Zoom)</option>
                <option value="rotation">Rotation (Angle)</option>
                <option value="opacity">Opacity (Alpha)</option>
                <option value="custom">Custom Property</option>
              </select>
            </div>

            <div class="gm-prop-row">
              <span class="gm-prop-label">Bake FPS</span>
              <select class="gm-prop-input" id="gmExprFps" style="width: 100px;">
                <option value="60">60 fps</option>
                <option value="30" selected>30 fps</option>
              </select>
            </div>

            <div class="gm-prop-title" style="margin-top: 6px;">Presets</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;" id="gmExprPresets">
              <button class="gm-btn" data-code="wiggle(5, 25);">Wiggle Soft</button>
              <button class="gm-btn" data-code="wiggle(12, 60);">Wiggle Hard</button>
              <button class="gm-btn" data-code="bounce(50, 4, 3);">Bounce</button>
              <button class="gm-btn" data-code="Math.sin(time * 6) * 40;">Sine</button>
              <button class="gm-btn" data-code="Math.abs(Math.sin(time * 3)) * 30;">Pulse</button>
              <button class="gm-btn" data-code="inertia(100, 2);">Inertia</button>
            </div>

            <div class="gm-prop-title" style="margin-top: 10px;">Expression Code</div>
            <textarea id="gmExprCode" style="width: 100%; height: 90px; background: #0a0b10; border: 1px solid var(--gm-border-subtle); border-radius: 8px; color: #f6c945; font-family: monospace; font-size: 13px; padding: 10px; outline: none;" placeholder="wiggle(5, 25);"></textarea>
          </div>
          <div class="gm-modal-footer">
            <button class="gm-btn" id="gmExprCancel">Cancel</button>
            <button class="gm-btn gm-btn-gold" id="gmExprApply">⚡ Bake into Keyframes</button>
          </div>
        </div>
      </div>
    `;

    const modal = this.container.querySelector('#gmExprModal');
    const closeBtn = this.container.querySelector('#gmExprClose');
    const cancelBtn = this.container.querySelector('#gmExprCancel');
    const applyBtn = this.container.querySelector('#gmExprApply');
    const codeArea = this.container.querySelector('#gmExprCode');

    const close = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);

    this.container.querySelectorAll('#gmExprPresets button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (codeArea) codeArea.value = btn.dataset.code;
      });
    });

    applyBtn?.addEventListener('click', () => {
      const prop = this.container.querySelector('#gmExprProp')?.value || 'rotation';
      const fps = parseInt(this.container.querySelector('#gmExprFps')?.value || '30');
      const code = codeArea?.value || 'wiggle(5, 25);';

      if (this.onApply) {
        this.onApply(prop, code, fps);
      }
      close();
    });
  }

  open(layer) {
    this.currentLayer = layer;
    const modal = this.container.querySelector('#gmExprModal');
    if (modal) modal.classList.add('active');
  }
}
