/**
 * Gold Motion Extra Tools Studio
 * Implements ToolStudioActivity, AiUpscaleEngine, BgCutEngine, DepthMapPanel, SpeedRampEngine, TrackingPanel
 */

export class ToolStudio {
  constructor(container, onApplyMedia = null) {
    this.container = container;
    this.onApplyMedia = onApplyMedia;
    this.activeTool = null;
    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="gm-page gm-tools-view">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 6px;">
            Gold Motion <span style="background: var(--gm-gold-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Extra Tools Studio</span>
          </h2>
          <p style="color: var(--gm-text-muted); font-size: 13.5px;">
            Professional AI & Motion graphics suites powered by Gold Motion engine models.
          </p>
        </div>

        <div class="gm-tools-grid" id="gmToolsGrid">
          <!-- AI Upscale -->
          <div class="gm-tool-card" data-tool="upscale">
            <div>
              <div class="gm-tool-header">
                <div class="gm-tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700;">AI Upscaler</h3>
                  <p style="font-size: 11px; color: var(--gm-text-muted);">Real-ESRGAN / Anime x4</p>
                </div>
                <span class="gm-tool-badge">TFLite AI</span>
              </div>
              <p style="font-size: 12.5px; color: var(--gm-text-muted); line-height: 1.45;">
                4x Super-resolution detail enhancer using Gold Motion Anime x4 & Soul x4 neural models.
              </p>
            </div>
            <button class="gm-btn gm-btn-gold" style="margin-top: 16px; width: 100%; justify-content: center;">Open Studio</button>
          </div>

          <!-- AI Background Cutout -->
          <div class="gm-tool-card" data-tool="bgcut">
            <div>
              <div class="gm-tool-header">
                <div class="gm-tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700;">AI Background Cut</h3>
                  <p style="font-size: 11px; color: var(--gm-text-muted);">BgCutEngine</p>
                </div>
                <span class="gm-tool-badge">AUTO MATTE</span>
              </div>
              <p style="font-size: 12.5px; color: var(--gm-text-muted); line-height: 1.45;">
                Instant portrait segmentation, alpha edge builder, and chroma green screen isolator.
              </p>
            </div>
            <button class="gm-btn gm-btn-gold" style="margin-top: 16px; width: 100%; justify-content: center;">Open Studio</button>
          </div>

          <!-- Depth Map 3D -->
          <div class="gm-tool-card" data-tool="depth">
            <div>
              <div class="gm-tool-header">
                <div class="gm-tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700;">Depth Map 3D</h3>
                  <p style="font-size: 11px; color: var(--gm-text-muted);">DepthMapPanel</p>
                </div>
                <span class="gm-tool-badge">3D PARALLAX</span>
              </div>
              <p style="font-size: 12.5px; color: var(--gm-text-muted); line-height: 1.45;">
                Generate monocular depth maps, 3D displacement meshes, and interactive gyroscope tilt.
              </p>
            </div>
            <button class="gm-btn gm-btn-gold" style="margin-top: 16px; width: 100%; justify-content: center;">Open Studio</button>
          </div>

          <!-- Speed Ramp Studio -->
          <div class="gm-tool-card" data-tool="speedramp">
            <div>
              <div class="gm-tool-header">
                <div class="gm-tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700;">Speed Ramp Studio</h3>
                  <p style="font-size: 11px; color: var(--gm-text-muted);">SpeedCurveView</p>
                </div>
                <span class="gm-tool-badge">RETIME PRO</span>
              </div>
              <p style="font-size: 12.5px; color: var(--gm-text-muted); line-height: 1.45;">
                Multi-point velocity remapping with smooth optical flow interpolation and curve presets.
              </p>
            </div>
            <button class="gm-btn gm-btn-gold" style="margin-top: 16px; width: 100%; justify-content: center;">Open Studio</button>
          </div>

          <!-- Motion Tracking -->
          <div class="gm-tool-card" data-tool="tracking">
            <div>
              <div class="gm-tool-header">
                <div class="gm-tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700;">Motion Tracking</h3>
                  <p style="font-size: 11px; color: var(--gm-text-muted);">TrackingPanel</p>
                </div>
                <span class="gm-tool-badge">TRACK GIZMO</span>
              </div>
              <p style="font-size: 12.5px; color: var(--gm-text-muted); line-height: 1.45;">
                Optical point and bounding box tracking to pin text, elements, and effects to video motion.
              </p>
            </div>
            <button class="gm-btn gm-btn-gold" style="margin-top: 16px; width: 100%; justify-content: center;">Open Studio</button>
          </div>

          <!-- Film Engine -->
          <div class="gm-tool-card" data-tool="film">
            <div>
              <div class="gm-tool-header">
                <div class="gm-tool-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                </div>
                <div>
                  <h3 style="font-size: 16px; font-weight: 700;">Film Engine 35mm</h3>
                  <p style="font-size: 11px; color: var(--gm-text-muted);">FilmEngine</p>
                </div>
                <span class="gm-tool-badge">ANALOG LAB</span>
              </div>
              <p style="font-size: 12.5px; color: var(--gm-text-muted); line-height: 1.45;">
                Authentic 35mm / 16mm grain generator, gate weave simulation, halation, and film damage.
              </p>
            </div>
            <button class="gm-btn gm-btn-gold" style="margin-top: 16px; width: 100%; justify-content: center;">Open Studio</button>
          </div>
        </div>

        <!-- Tool Modal Container -->
        <div id="gmToolModal" class="gm-modal-scrim"></div>
      </div>
    `;

    this.setupEvents();
  }

  setupEvents() {
    this.container.querySelectorAll('[data-tool]').forEach(card => {
      card.addEventListener('click', () => {
        const tool = card.dataset.tool;
        this.openTool(tool);
      });
    });
  }

  openTool(tool) {
    const modal = this.container.querySelector('#gmToolModal');
    if (!modal) return;

    if (tool === 'upscale') {
      this.renderUpscaleTool(modal);
    } else if (tool === 'bgcut') {
      this.renderBgCutTool(modal);
    } else if (tool === 'depth') {
      this.renderDepthTool(modal);
    } else if (tool === 'speedramp') {
      this.renderSpeedRampTool(modal);
    } else if (tool === 'tracking') {
      this.renderTrackingTool(modal);
    } else if (tool === 'film') {
      this.renderFilmTool(modal);
    }

    modal.classList.add('active');
  }

  renderUpscaleTool(modal) {
    modal.innerHTML = `
      <div class="gm-modal-card" style="max-width: 680px;">
        <div class="gm-modal-header">
          <h3>AI Upscaler Studio (QualitySplitView)</h3>
          <button class="gm-btn gm-btn-icon" id="gmToolClose">✕</button>
        </div>
        <div class="gm-modal-body">
          <p style="font-size: 13px; color: var(--gm-text-muted);">
            Compare source vs upscaled output in real-time with the split comparison slider.
          </p>

          <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden;" id="gmSplitWrapper">
            <img src="./assets/Logo/1785609380277_upscaled.png" style="width: 100%; height: 100%; object-fit: cover;" id="gmImgB">
            <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 50%; overflow: hidden; border-right: 2px solid var(--gm-gold-primary);" id="gmSplitA">
              <img src="./assets/Logo/1785609380277_upscaled.png" style="width: 200%; height: 100%; object-fit: cover; filter: blur(3px);">
            </div>
            <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;">SOURCE 1x</div>
            <div style="position: absolute; top: 10px; right: 10px; background: rgba(246,201,69,0.9); color: #000; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800;">UPSCALED 4x (AI)</div>
          </div>

          <div class="gm-prop-row">
            <span class="gm-prop-label">AI Model</span>
            <select class="gm-prop-input" style="width: 180px;">
              <option value="anime">gm_anime_x4.tflite (Anime / Clean)</option>
              <option value="soul">gm_soul_x4.tflite (Realistic / Cinematic)</option>
            </select>
          </div>

          <div class="gm-prop-row">
            <span class="gm-prop-label">Sharpen & Enhance</span>
            <input type="range" class="gm-slider" min="0" max="100" value="75">
          </div>
        </div>
        <div class="gm-modal-footer">
          <button class="gm-btn" id="gmToolCancel">Close</button>
          <button class="gm-btn gm-btn-gold" id="gmToolAction">Apply to Current Layer</button>
        </div>
      </div>
    `;
    this.bindModalClose(modal);

    // Interactive split slider
    const wrapper = modal.querySelector('#gmSplitWrapper');
    const splitA = modal.querySelector('#gmSplitA');
    if (wrapper && splitA) {
      wrapper.addEventListener('pointermove', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const p = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        splitA.style.width = `${p}%`;
      });
    }
  }

  renderBgCutTool(modal) {
    modal.innerHTML = `
      <div class="gm-modal-card">
        <div class="gm-modal-header">
          <h3>AI Background Cutout (BgCutEngine)</h3>
          <button class="gm-btn gm-btn-icon" id="gmToolClose">✕</button>
        </div>
        <div class="gm-modal-body">
          <div style="display: flex; gap: 12px; align-items: center; justify-content: center; padding: 24px; background: repeating-conic-gradient(#222 0% 25%, #333 0% 50%) 50% / 20px 20px; border-radius: 12px;">
            <div style="width: 140px; height: 140px; border-radius: 50%; background: var(--gm-gold-gradient); display: grid; place-items: center; box-shadow: 0 8px 30px rgba(0,0,0,0.6);">
              <span style="font-size: 38px;">✂️</span>
            </div>
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Edge Feather</span>
            <input type="range" class="gm-slider" min="0" max="20" value="4">
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Subject Mask Invert</span>
            <input type="checkbox">
          </div>
        </div>
        <div class="gm-modal-footer">
          <button class="gm-btn" id="gmToolCancel">Cancel</button>
          <button class="gm-btn gm-btn-gold" id="gmToolAction">Extract Cutout Layer</button>
        </div>
      </div>
    `;
    this.bindModalClose(modal);
  }

  renderDepthTool(modal) {
    modal.innerHTML = `
      <div class="gm-modal-card">
        <div class="gm-modal-header">
          <h3>Depth Map 3D Studio (DepthMapPanel)</h3>
          <button class="gm-btn gm-btn-icon" id="gmToolClose">✕</button>
        </div>
        <div class="gm-modal-body">
          <div style="width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #111, #888, #fff); border-radius: 12px; display: grid; place-items: center;">
            <span style="background: rgba(0,0,0,0.7); color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700;">Depth Elevation Scanner Active</span>
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Displacement Depth</span>
            <input type="range" class="gm-slider" min="0" max="100" value="60">
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Parallax Smoothing</span>
            <input type="range" class="gm-slider" min="0" max="50" value="25">
          </div>
        </div>
        <div class="gm-modal-footer">
          <button class="gm-btn" id="gmToolCancel">Cancel</button>
          <button class="gm-btn gm-btn-gold" id="gmToolAction">Generate 3D Depth Layer</button>
        </div>
      </div>
    `;
    this.bindModalClose(modal);
  }

  renderSpeedRampTool(modal) {
    modal.innerHTML = `
      <div class="gm-modal-card" style="max-width: 600px;">
        <div class="gm-modal-header">
          <h3>Speed Ramp Studio (SpeedCurveView)</h3>
          <button class="gm-btn gm-btn-icon" id="gmToolClose">✕</button>
        </div>
        <div class="gm-modal-body">
          <div style="width: 100%; height: 180px; background: #0c0d12; border: 1px solid var(--gm-border-subtle); border-radius: 12px; position: relative;">
            <svg width="100%" height="100%" viewBox="0 0 500 180" style="overflow: visible;">
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4"/>
              <path d="M0,90 C120,90 140,20 250,20 C360,20 380,160 500,90" fill="none" stroke="var(--gm-gold-primary)" stroke-width="3"/>
              <circle cx="0" cy="90" r="6" fill="#fff" stroke="var(--gm-gold-primary)" stroke-width="2"/>
              <circle cx="250" cy="20" r="6" fill="#fff" stroke="var(--gm-gold-primary)" stroke-width="2"/>
              <circle cx="500" cy="90" r="6" fill="#fff" stroke="var(--gm-gold-primary)" stroke-width="2"/>
            </svg>
            <span style="position: absolute; top: 10px; right: 10px; font-size: 11px; color: var(--gm-gold-primary); font-weight: 700;">Fast 4.0x ➔ Slow 0.2x</span>
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Curve Preset</span>
            <select class="gm-prop-input" style="width: 160px;">
              <option>Hero Velocity</option>
              <option>Bullet Time</option>
              <option>Montage Flash</option>
              <option>Custom Bezier</option>
            </select>
          </div>
        </div>
        <div class="gm-modal-footer">
          <button class="gm-btn" id="gmToolCancel">Cancel</button>
          <button class="gm-btn gm-btn-gold" id="gmToolAction">Apply Retime to Clip</button>
        </div>
      </div>
    `;
    this.bindModalClose(modal);
  }

  renderTrackingTool(modal) {
    modal.innerHTML = `
      <div class="gm-modal-card">
        <div class="gm-modal-header">
          <h3>Motion Tracking Studio (TrackingPanel)</h3>
          <button class="gm-btn gm-btn-icon" id="gmToolClose">✕</button>
        </div>
        <div class="gm-modal-body">
          <div style="width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; position: relative; overflow: hidden; display: grid; place-items: center;">
            <div style="position: absolute; width: 60px; height: 60px; border: 2px solid var(--gm-gold-primary); box-shadow: 0 0 12px var(--gm-gold-glow); display: grid; place-items: center;">
              <div style="width: 6px; height: 6px; background: var(--gm-gold-primary); border-radius: 50%;"></div>
            </div>
            <span style="color: var(--gm-text-muted); font-size: 12px;">Drag tracking target box over object to track</span>
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Tracking Mode</span>
            <select class="gm-prop-input" style="width: 140px;">
              <option>Point Tracking</option>
              <option>Face Tracking</option>
              <option>Region Bounding Box</option>
            </select>
          </div>
        </div>
        <div class="gm-modal-footer">
          <button class="gm-btn" id="gmToolCancel">Cancel</button>
          <button class="gm-btn gm-btn-gold" id="gmToolAction">Start Tracking</button>
        </div>
      </div>
    `;
    this.bindModalClose(modal);
  }

  renderFilmTool(modal) {
    modal.innerHTML = `
      <div class="gm-modal-card">
        <div class="gm-modal-header">
          <h3>Film Engine 35mm (FilmEngine)</h3>
          <button class="gm-btn gm-btn-icon" id="gmToolClose">✕</button>
        </div>
        <div class="gm-modal-body">
          <div class="gm-prop-row">
            <span class="gm-prop-label">Film Stock</span>
            <select class="gm-prop-input" style="width: 160px;">
              <option>Kodak 5219 Vision3</option>
              <option>Fuji Eterna 500T</option>
              <option>16mm Vintage B&W</option>
            </select>
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Grain Density</span>
            <input type="range" class="gm-slider" min="0" max="100" value="45">
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Red Halation Glow</span>
            <input type="range" class="gm-slider" min="0" max="100" value="65">
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Gate Weave Jitter</span>
            <input type="range" class="gm-slider" min="0" max="50" value="15">
          </div>
        </div>
        <div class="gm-modal-footer">
          <button class="gm-btn" id="gmToolCancel">Cancel</button>
          <button class="gm-btn gm-btn-gold" id="gmToolAction">Add Film Engine Layer</button>
        </div>
      </div>
    `;
    this.bindModalClose(modal);
  }

  bindModalClose(modal) {
    const closeBtn = modal.querySelector('#gmToolClose');
    const cancelBtn = modal.querySelector('#gmToolCancel');
    const actionBtn = modal.querySelector('#gmToolAction');

    const close = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);
    actionBtn?.addEventListener('click', () => {
      alert('Applied to project!');
      close();
    });
  }
}
