/**
 * Gold Motion Export Dialog & Media Rendering Engine
 * Implements GMExportManager & GMExportDialogStyle with video, gif, png, and XML export
 */

import { XmlHandler } from '../xml/XmlHandler.js';

export class ExportDialog {
  constructor(container, getScene, getRenderer) {
    this.container = container;
    this.getScene = getScene;
    this.getRenderer = getRenderer;
    this.isExporting = false;
    this.abortExport = false;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div id="gmExportModal" class="gm-modal-scrim">
        <div class="gm-modal-card" style="max-width: 500px;">
          <div class="gm-modal-header" style="background: linear-gradient(135deg, rgba(246, 201, 69, 0.1), transparent);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🎬</span>
              <div>
                <h3 style="font-size: 16px;">Export & Share</h3>
                <p style="font-size: 11px; color: var(--gm-gold-primary); font-weight: 700;">Gold Motion Pro Export Studio</p>
              </div>
            </div>
            <button class="gm-btn gm-btn-icon" id="gmExportClose">✕</button>
          </div>

          <div class="gm-modal-body" id="gmExportForm">
            <!-- Format selection -->
            <div class="gm-prop-title">Export Format</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;" id="gmExportFormats">
              <button class="gm-btn gm-btn-gold" data-format="video">Video (MP4/WebM)</button>
              <button class="gm-btn" data-format="gif">GIF Animation</button>
              <button class="gm-btn" data-format="png">Current PNG</button>
              <button class="gm-btn" data-format="xml">XML Project</button>
              <button class="gm-btn" data-format="sequence">PNG Sequence</button>
              <button class="gm-btn" data-format="package">Project Package</button>
            </div>

            <!-- Video settings (visible for video) -->
            <div id="gmVideoSettings">
              <div class="gm-prop-row" style="margin-top: 10px;">
                <span class="gm-prop-label">Resolution</span>
                <select class="gm-prop-input" id="gmExportRes" style="width: 140px;">
                  <option value="1080">1080p Full HD</option>
                  <option value="720">720p HD</option>
                  <option value="1440">1440p 2K</option>
                  <option value="2160">2160p 4K UHD</option>
                </select>
              </div>

              <div class="gm-prop-row">
                <span class="gm-prop-label">Frame Rate</span>
                <select class="gm-prop-input" id="gmExportFps" style="width: 140px;">
                  <option value="60">60 fps (Ultra Smooth)</option>
                  <option value="30" selected>30 fps (Standard)</option>
                  <option value="24">24 fps (Cinematic)</option>
                </select>
              </div>

              <div class="gm-prop-row">
                <span class="gm-prop-label">Quality Bitrate</span>
                <select class="gm-prop-input" id="gmExportBitrate" style="width: 140px;">
                  <option value="16000000">High (16 Mbps)</option>
                  <option value="8000000" selected>Medium (8 Mbps)</option>
                  <option value="4000000">Low (4 Mbps)</option>
                </select>
              </div>
            </div>

            <!-- Progress section -->
            <div id="gmProgressSection" style="display: none; margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                <span id="gmProgressLabel" style="font-weight: 700;">Rendering frames…</span>
                <span id="gmProgressPercent" style="color: var(--gm-gold-primary); font-weight: 800;">0%</span>
              </div>
              <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                <div id="gmProgressBar" style="width: 0%; height: 100%; background: var(--gm-gold-gradient); transition: width 0.1s linear;"></div>
              </div>
            </div>
          </div>

          <div class="gm-modal-footer">
            <button class="gm-btn" id="gmExportCancel">Cancel</button>
            <button class="gm-btn gm-btn-gold" id="gmExportStart">Export Now</button>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  setupEvents() {
    const modal = this.container.querySelector('#gmExportModal');
    const closeBtn = this.container.querySelector('#gmExportClose');
    const cancelBtn = this.container.querySelector('#gmExportCancel');
    const startBtn = this.container.querySelector('#gmExportStart');

    const close = () => {
      if (this.isExporting) {
        if (!confirm('Cancel active export?')) return;
        this.abortExport = true;
      }
      modal.classList.remove('active');
    };

    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);

    // Format selection
    let selectedFormat = 'video';
    this.container.querySelectorAll('#gmExportFormats button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('#gmExportFormats button').forEach(b => b.classList.remove('gm-btn-gold'));
        btn.classList.add('gm-btn-gold');
        selectedFormat = btn.dataset.format;

        const videoSettings = this.container.querySelector('#gmVideoSettings');
        if (videoSettings) {
          videoSettings.style.display = selectedFormat === 'video' ? 'block' : 'none';
        }
      });
    });

    startBtn?.addEventListener('click', async () => {
      if (this.isExporting) return;
      await this.runExport(selectedFormat);
    });
  }

  async runExport(format) {
    const scene = this.getScene();
    const renderer = this.getRenderer();
    if (!scene || !renderer) return;

    if (format === 'xml') {
      const xml = XmlHandler.serialize(scene);
      this.downloadBlob(new Blob([xml], { type: 'application/xml' }), `${scene.title.replace(/\s+/g, '_')}.xml`);
      this.closeModal();
      return;
    }

    if (format === 'png') {
      const canvas = renderer.canvas;
      canvas.toBlob((blob) => {
        this.downloadBlob(blob, `${scene.title.replace(/\s+/g, '_')}_frame.png`);
        this.closeModal();
      }, 'image/png');
      return;
    }

    if (format === 'package') {
      const xml = XmlHandler.serialize(scene);
      const pkg = JSON.stringify({
        schema: 'GoldMotionPackage',
        version: '8.5.1',
        title: scene.title,
        xml
      }, null, 2);
      this.downloadBlob(new Blob([pkg], { type: 'application/json' }), `${scene.title.replace(/\s+/g, '_')}.amproject`);
      this.closeModal();
      return;
    }

    // Video / GIF Export frame-by-frame
    this.isExporting = true;
    this.abortExport = false;

    const progressSection = this.container.querySelector('#gmProgressSection');
    const progressBar = this.container.querySelector('#gmProgressBar');
    const progressPercent = this.container.querySelector('#gmProgressPercent');
    const progressLabel = this.container.querySelector('#gmProgressLabel');
    const startBtn = this.container.querySelector('#gmExportStart');

    if (progressSection) progressSection.style.display = 'block';
    if (startBtn) startBtn.disabled = true;

    const fps = parseInt(this.container.querySelector('#gmExportFps')?.value || String(scene.fps));
    const bitrate = parseInt(this.container.querySelector('#gmExportBitrate')?.value || '8000000');
    const totalFrames = Math.floor((scene.totalTime / 1000) * fps);

    // Setup MediaStreamRecorder from canvas
    const canvas = renderer.canvas;
    const stream = canvas.captureStream(fps);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    
    let recorder;
    const chunks = [];
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start();
    } catch (e) {
      console.warn('[ExportDialog] MediaRecorder error, falling back:', e);
    }

    // Step through each frame
    for (let f = 0; f <= totalFrames; f++) {
      if (this.abortExport) break;

      const timeMs = (f / fps) * 1000;
      renderer.render(scene, timeMs);

      const percent = Math.floor((f / totalFrames) * 100);
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressLabel) progressLabel.textContent = `Frame ${f} of ${totalFrames} (${percent}%)`;

      // Allow UI tick
      await new Promise(r => setTimeout(r, 1000 / fps));
    }

    if (!this.abortExport && recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mime });
        this.downloadBlob(videoBlob, `${scene.title.replace(/\s+/g, '_')}_rendered.webm`);
        this.finishExport();
      };
      recorder.stop();
    } else {
      this.finishExport();
    }
  }

  finishExport() {
    this.isExporting = false;
    this.abortExport = false;
    const progressSection = this.container.querySelector('#gmProgressSection');
    const startBtn = this.container.querySelector('#gmExportStart');
    if (progressSection) progressSection.style.display = 'none';
    if (startBtn) startBtn.disabled = false;
    this.closeModal();
  }

  closeModal() {
    const modal = this.container.querySelector('#gmExportModal');
    if (modal) modal.classList.remove('active');
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  open() {
    const modal = this.container.querySelector('#gmExportModal');
    if (modal) modal.classList.add('active');
  }
}
