/**
 * Gold Motion Create Project Dialog
 * Implements Android Create Project modal with aspect ratios, resolutions, and background presets
 */

import { Scene } from '../engine/Scene.js';

export class CreateProjectModal {
  constructor(container, onCreateProject) {
    this.container = container;
    this.onCreateProject = onCreateProject;

    this.selectedAspect = '16:9';
    this.selectedBg = '#000000';
    this.selectedRes = 1080;
    this.selectedFps = 30;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div id="gmCreateModal" class="gm-modal-scrim">
        <div class="gm-modal-card">
          <div class="gm-modal-header">
            <h3>✨ Create New Project</h3>
            <button class="gm-btn gm-btn-icon" id="gmCreateClose">✕</button>
          </div>
          <div class="gm-modal-body">
            <!-- Project Title -->
            <div class="gm-prop-row">
              <span class="gm-prop-label">Project Name</span>
              <input type="text" id="gmProjectTitleInput" class="gm-prop-input" value="Project 1" style="width: 220px; text-align: left;">
            </div>

            <!-- Aspect Ratios -->
            <div class="gm-prop-title">Aspect Ratio</div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;" id="gmAspectGrid">
              <button class="gm-btn gm-btn-gold" data-aspect="16:9" style="flex-direction: column; padding: 10px 4px;">
                <div style="width: 28px; height: 16px; border: 1.5px solid currentColor; border-radius: 2px; margin-bottom: 4px;"></div>
                <span style="font-size: 11px;">16:9</span>
              </button>
              <button class="gm-btn" data-aspect="9:16" style="flex-direction: column; padding: 10px 4px;">
                <div style="width: 16px; height: 28px; border: 1.5px solid currentColor; border-radius: 2px; margin-bottom: 4px;"></div>
                <span style="font-size: 11px;">9:16</span>
              </button>
              <button class="gm-btn" data-aspect="4:5" style="flex-direction: column; padding: 10px 4px;">
                <div style="width: 18px; height: 22px; border: 1.5px solid currentColor; border-radius: 2px; margin-bottom: 4px;"></div>
                <span style="font-size: 11px;">4:5</span>
              </button>
              <button class="gm-btn" data-aspect="1:1" style="flex-direction: column; padding: 10px 4px;">
                <div style="width: 20px; height: 20px; border: 1.5px solid currentColor; border-radius: 2px; margin-bottom: 4px;"></div>
                <span style="font-size: 11px;">1:1</span>
              </button>
              <button class="gm-btn" data-aspect="4:3" style="flex-direction: column; padding: 10px 4px;">
                <div style="width: 24px; height: 18px; border: 1.5px solid currentColor; border-radius: 2px; margin-bottom: 4px;"></div>
                <span style="font-size: 11px;">4:3</span>
              </button>
            </div>

            <!-- Resolution & FPS -->
            <div class="gm-prop-row" style="margin-top: 10px;">
              <span class="gm-prop-label">Resolution</span>
              <select class="gm-prop-input" id="gmCreateRes" style="width: 160px;">
                <option value="1080" selected>1080p Full HD</option>
                <option value="720">720p HD</option>
                <option value="1440">1440p 2K</option>
                <option value="2160">2160p 4K UHD</option>
              </select>
            </div>

            <div class="gm-prop-row">
              <span class="gm-prop-label">Frame Rate</span>
              <select class="gm-prop-input" id="gmCreateFps" style="width: 160px;">
                <option value="60">60 fps (Ultra Smooth)</option>
                <option value="30" selected>30 fps (Standard)</option>
                <option value="24">24 fps (Cinematic)</option>
              </select>
            </div>

            <!-- Background Color -->
            <div class="gm-prop-title">Background</div>
            <div style="display: flex; gap: 8px;" id="gmBgChips">
              <div class="gm-bg-chip active" data-color="#000000" style="width: 32px; height: 32px; border-radius: 8px; background: #000; border: 2px solid var(--gm-gold-primary); cursor: pointer;" title="Black"></div>
              <div class="gm-bg-chip" data-color="#ffffff" style="width: 32px; height: 32px; border-radius: 8px; background: #fff; border: 2px solid transparent; cursor: pointer;" title="White"></div>
              <div class="gm-bg-chip" data-color="#00000000" style="width: 32px; height: 32px; border-radius: 8px; background: repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 50% / 10px 10px; border: 2px solid transparent; cursor: pointer;" title="Transparent"></div>
              <div class="gm-bg-chip" data-color="#00ff00" style="width: 32px; height: 32px; border-radius: 8px; background: #00ff00; border: 2px solid transparent; cursor: pointer;" title="Green Screen"></div>
              <div class="gm-bg-chip" data-color="#d8d8d8" style="width: 32px; height: 32px; border-radius: 8px; background: #d8d8d8; border: 2px solid transparent; cursor: pointer;" title="Light Grey"></div>
            </div>
          </div>
          <div class="gm-modal-footer">
            <button class="gm-btn" id="gmCreateCancel">Cancel</button>
            <button class="gm-btn gm-btn-gold" id="gmCreateSubmit">Create Project</button>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  setupEvents() {
    const modal = this.container.querySelector('#gmCreateModal');
    const closeBtn = this.container.querySelector('#gmCreateClose');
    const cancelBtn = this.container.querySelector('#gmCreateCancel');
    const submitBtn = this.container.querySelector('#gmCreateSubmit');

    const close = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);

    // Aspect buttons
    this.container.querySelectorAll('#gmAspectGrid button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('#gmAspectGrid button').forEach(b => b.classList.remove('gm-btn-gold'));
        btn.classList.add('gm-btn-gold');
        this.selectedAspect = btn.dataset.aspect;
      });
    });

    // Background chips
    this.container.querySelectorAll('#gmBgChips .gm-bg-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.container.querySelectorAll('#gmBgChips .gm-bg-chip').forEach(c => c.style.borderColor = 'transparent');
        chip.style.borderColor = 'var(--gm-gold-primary)';
        this.selectedBg = chip.dataset.color;
      });
    });

    submitBtn?.addEventListener('click', () => {
      const title = this.container.querySelector('#gmProjectTitleInput')?.value || 'Project 1';
      const res = parseInt(this.container.querySelector('#gmCreateRes')?.value || '1080');
      const fps = parseInt(this.container.querySelector('#gmCreateFps')?.value || '30');

      let width = 1920;
      let height = 1080;

      if (this.selectedAspect === '9:16') {
        width = Math.round((res * 9) / 16);
        height = res;
      } else if (this.selectedAspect === '4:5') {
        width = Math.round((res * 4) / 5);
        height = res;
      } else if (this.selectedAspect === '1:1') {
        width = res;
        height = res;
      } else if (this.selectedAspect === '4:3') {
        width = Math.round((res * 4) / 3);
        height = res;
      } else {
        // 16:9
        height = res;
        width = Math.round((res * 16) / 9);
      }

      const scene = new Scene({
        title,
        width,
        height,
        bgcolor: this.selectedBg,
        totalTime: 10000,
        fps
      });

      // Add a starter gold shape layer
      scene.addLayer(scene.createLayer('shape', {
        label: 'Gold Shape 1',
        tag: 'gold',
        fillColor: '#f6c945',
        shapeId: 'com.alightcreative.shapes.roundrect'
      }));

      if (this.onCreateProject) {
        this.onCreateProject(scene);
      }
      close();
    });
  }

  open() {
    const modal = this.container.querySelector('#gmCreateModal');
    if (modal) modal.classList.add('active');
  }
}
