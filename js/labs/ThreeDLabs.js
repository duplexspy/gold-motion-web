/**
 * Gold Motion 3D Labs Studio
 * Implements GmLabsPage, Gm3d, GmQuadTess, 3D particles, 3D point cloud, and 3D camera controls
 */

export class ThreeDLabs {
  constructor(container, onAddToProject = null) {
    this.container = container;
    this.onAddToProject = onAddToProject;
    this.canvas = null;
    this.gl = null;
    this.animationId = null;

    // 3D Camera & Scene State
    this.camera = {
      rotX: 20,
      rotY: -35,
      zoom: 3.5,
      target: [0, 0, 0]
    };

    this.activeMode = 'particles'; // 'particles', 'quad', 'pointcloud', 'cube', 'origami'
    this.particleCount = 1200;
    this.particles = [];
    this.tessellationLevel = 8;
    this.time = 0;

    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    this.initUI();
    this.initParticles();
    this.startLoop();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="gm-page gm-labs-view">
        <div class="gm-labs-viewport" id="gmLabsViewport">
          <canvas id="gmLabsCanvas"></canvas>
          <div class="gm-canvas-overlay">
            <button class="gm-overlay-btn" id="gmLabsResetCam">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset Camera
            </button>
            <button class="gm-overlay-btn" id="gmLabsAddLayer" style="border-color: var(--gm-border-gold); color: var(--gm-gold-primary);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add 3D Layer to Project
            </button>
          </div>
        </div>

        <div class="gm-labs-sidebar">
          <div class="gm-prop-header">
            <span>3D Labs Studio</span>
            <span class="gm-badge-pro">PRO 3D</span>
          </div>

          <div class="gm-prop-section">
            <div class="gm-prop-title">3D Lab Modes</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="gm-btn ${this.activeMode === 'particles' ? 'gm-btn-gold' : ''}" data-mode="particles">3D Particles</button>
              <button class="gm-btn ${this.activeMode === 'quad' ? 'gm-btn-gold' : ''}" data-mode="quad">Quad Tess (GmQuadTess)</button>
              <button class="gm-btn ${this.activeMode === 'pointcloud' ? 'gm-btn-gold' : ''}" data-mode="pointcloud">Point Cloud</button>
              <button class="gm-btn ${this.activeMode === 'cube' ? 'gm-btn-gold' : ''}" data-mode="cube">Cube Skybox</button>
              <button class="gm-btn ${this.activeMode === 'origami' ? 'gm-btn-gold' : ''}" data-mode="origami">Origami Facets</button>
            </div>
          </div>

          <div class="gm-prop-section">
            <div class="gm-prop-title">3D Camera Rig</div>
            <div class="gm-prop-row">
              <span class="gm-prop-label">Rotation X (Pitch)</span>
              <input type="range" class="gm-slider" id="gmLabsRotX" min="-90" max="90" value="${this.camera.rotX}" style="width: 140px;">
            </div>
            <div class="gm-prop-row">
              <span class="gm-prop-label">Rotation Y (Yaw)</span>
              <input type="range" class="gm-slider" id="gmLabsRotY" min="-180" max="180" value="${this.camera.rotY}" style="width: 140px;">
            </div>
            <div class="gm-prop-row">
              <span class="gm-prop-label">Distance (Zoom)</span>
              <input type="range" class="gm-slider" id="gmLabsZoom" min="1" max="10" step="0.1" value="${this.camera.zoom}" style="width: 140px;">
            </div>
          </div>

          <div class="gm-prop-section" id="gmLabsModeSettings">
            <div class="gm-prop-title">Simulation Parameters</div>
            <div class="gm-prop-row">
              <span class="gm-prop-label">Particle Count</span>
              <span id="gmLabsCountVal" style="color: var(--gm-gold-primary); font-weight: 700;">1200</span>
            </div>
            <input type="range" class="gm-slider" id="gmLabsCountSlider" min="200" max="3000" step="100" value="1200" style="width: 100%;">
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#gmLabsCanvas');
    this.setupEvents();
  }

  setupEvents() {
    // Mode switcher buttons
    this.container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.container.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('gm-btn-gold'));
        btn.classList.add('gm-btn-gold');
        this.activeMode = btn.dataset.mode;
        this.initParticles();
      });
    });

    // Sliders
    const rotX = this.container.querySelector('#gmLabsRotX');
    const rotY = this.container.querySelector('#gmLabsRotY');
    const zoom = this.container.querySelector('#gmLabsZoom');

    rotX?.addEventListener('input', (e) => this.camera.rotX = parseFloat(e.target.value));
    rotY?.addEventListener('input', (e) => this.camera.rotY = parseFloat(e.target.value));
    zoom?.addEventListener('input', (e) => this.camera.zoom = parseFloat(e.target.value));

    const countSlider = this.container.querySelector('#gmLabsCountSlider');
    const countVal = this.container.querySelector('#gmLabsCountVal');
    countSlider?.addEventListener('input', (e) => {
      this.particleCount = parseInt(e.target.value);
      if (countVal) countVal.textContent = this.particleCount;
      this.initParticles();
    });

    // Reset camera
    this.container.querySelector('#gmLabsResetCam')?.addEventListener('click', () => {
      this.camera.rotX = 20;
      this.camera.rotY = -35;
      this.camera.zoom = 3.5;
      if (rotX) rotX.value = 20;
      if (rotY) rotY.value = -35;
      if (zoom) zoom.value = 3.5;
    });

    // Add layer
    this.container.querySelector('#gmLabsAddLayer')?.addEventListener('click', () => {
      if (this.onAddToProject) {
        this.onAddToProject({
          type: 'shape',
          label: `3D ${this.activeMode.toUpperCase()}`,
          tag: 'gold',
          fillColor: '#f6c945',
          transform: {
            rotationX: this.camera.rotX,
            rotationY: this.camera.rotY,
            scale: [1, 1],
            location: [960, 540]
          }
        });
      }
    });

    // Mouse / Touch 3D Camera orbit
    const vp = this.container.querySelector('#gmLabsViewport');
    vp.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = { x: e.clientX, y: e.clientY };

      this.camera.rotY += dx * 0.5;
      this.camera.rotX = Math.max(-89, Math.min(89, this.camera.rotX + dy * 0.5));

      if (rotX) rotX.value = this.camera.rotX;
      if (rotY) rotY.value = this.camera.rotY;
    });

    window.addEventListener('pointerup', () => this.isDragging = false);

    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camera.zoom = Math.max(1, Math.min(10, this.camera.zoom + e.deltaY * 0.005));
      if (zoom) zoom.value = this.camera.zoom;
    }, { passive: false });
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 4,
        speed: 0.2 + Math.random() * 0.8,
        size: 1 + Math.random() * 3,
        color: Math.random() > 0.3 ? '#f6c945' : (Math.random() > 0.5 ? '#ffffff' : '#ffd86b')
      });
    }
  }

  startLoop() {
    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  draw() {
    if (!this.canvas) return;
    const vp = this.canvas.parentElement;
    if (this.canvas.width !== vp.clientWidth || this.canvas.height !== vp.clientHeight) {
      this.canvas.width = vp.clientWidth;
      this.canvas.height = vp.clientHeight;
    }

    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    this.time += 0.016;

    const radX = (this.camera.rotX * Math.PI) / 180;
    const radY = (this.camera.rotY * Math.PI) / 180;
    const fov = 400 / this.camera.zoom;

    // 3D Point Projection Helper
    const project = (x, y, z) => {
      // Rotation Y
      const cosY = Math.cos(radY), sinY = Math.sin(radY);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;

      // Rotation X
      const cosX = Math.cos(radX), sinX = Math.sin(radX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX + this.camera.zoom * 2;

      if (z2 <= 0.1) return null;
      const scale = fov / z2;
      return {
        px: w / 2 + x1 * scale,
        py: h / 2 + y2 * scale,
        depth: z2,
        scale
      };
    };

    // Draw Grid Base
    ctx.strokeStyle = 'rgba(246, 201, 69, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 3;
    const gridSteps = 6;
    for (let i = -gridSteps; i <= gridSteps; i++) {
      const pA = project((i / gridSteps) * gridSize, 1.5, -gridSize);
      const pB = project((i / gridSteps) * gridSize, 1.5, gridSize);
      if (pA && pB) {
        ctx.beginPath();
        ctx.moveTo(pA.px, pA.py);
        ctx.lineTo(pB.px, pB.py);
        ctx.stroke();
      }

      const pC = project(-gridSize, 1.5, (i / gridSteps) * gridSize);
      const pD = project(gridSize, 1.5, (i / gridSteps) * gridSize);
      if (pC && pD) {
        ctx.beginPath();
        ctx.moveTo(pC.px, pC.py);
        ctx.lineTo(pD.px, pD.py);
        ctx.stroke();
      }
    }

    if (this.activeMode === 'particles') {
      // Draw 3D Particles
      for (const p of this.particles) {
        p.y += Math.sin(this.time * p.speed + p.x) * 0.005;
        const pt = project(p.x, p.y, p.z);
        if (pt) {
          ctx.fillStyle = p.color;
          const sz = Math.max(1, p.size * (pt.scale / 100));
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, sz, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (this.activeMode === 'quad') {
      // GmQuadTess Mesh Wireframe
      const rows = this.tessellationLevel;
      const cols = this.tessellationLevel;
      ctx.strokeStyle = 'rgba(246, 201, 69, 0.7)';
      ctx.lineWidth = 1.5;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const u = (c / cols - 0.5) * 2;
          const v = (r / rows - 0.5) * 2;
          const wave = Math.sin(u * 3 + this.time * 2) * Math.cos(v * 3 + this.time * 2) * 0.35;
          const pt = project(u, wave, v);

          if (c < cols) {
            const uNext = ((c + 1) / cols - 0.5) * 2;
            const waveNext = Math.sin(uNext * 3 + this.time * 2) * Math.cos(v * 3 + this.time * 2) * 0.35;
            const ptNext = project(uNext, waveNext, v);
            if (pt && ptNext) {
              ctx.beginPath();
              ctx.moveTo(pt.px, pt.py);
              ctx.lineTo(ptNext.px, ptNext.py);
              ctx.stroke();
            }
          }

          if (r < rows) {
            const vNext = ((r + 1) / rows - 0.5) * 2;
            const waveNext = Math.sin(u * 3 + this.time * 2) * Math.cos(vNext * 3 + this.time * 2) * 0.35;
            const ptNext = project(u, waveNext, vNext);
            if (pt && ptNext) {
              ctx.beginPath();
              ctx.moveTo(pt.px, pt.py);
              ctx.lineTo(ptNext.px, ptNext.py);
              ctx.stroke();
            }
          }
        }
      }
    } else if (this.activeMode === 'cube') {
      // 3D Cube Skybox
      const size = 1.2;
      const vertices = [
        [-size, -size, -size], [size, -size, -size], [size, size, -size], [-size, size, -size],
        [-size, -size, size], [size, -size, size], [size, size, size], [-size, size, size]
      ];
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      ctx.strokeStyle = '#f6c945';
      ctx.lineWidth = 2;
      for (const [i1, i2] of edges) {
        const v1 = vertices[i1];
        const v2 = vertices[i2];
        const p1 = project(v1[0], v1[1], v1[2]);
        const p2 = project(v2[0], v2[1], v2[2]);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        }
      }
    } else {
      // Point cloud / Origami
      for (let i = 0; i < 400; i++) {
        const theta = i * 0.15;
        const phi = Math.acos(1 - 2 * (i / 400));
        const r = 1.4 + Math.sin(theta * 3 + this.time * 2) * 0.15;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        const pt = project(x, y, z);
        if (pt) {
          ctx.fillStyle = '#ffd86b';
          ctx.fillRect(pt.px - 1.5, pt.py - 1.5, 3, 3);
        }
      }
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
