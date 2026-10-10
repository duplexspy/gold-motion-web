/**
 * Gold Motion Web Application Entry Point
 * Faithfully converted from decompiled Gold Motion APK
 * Preserves authentic Android UI, navigation, timeline, tools, and effects
 * Enforces strict Mandatory Export Guard requiring both XML and Video export before tab closure
 */

import { Scene } from './engine/Scene.js';
import { Timeline } from './engine/Timeline.js';
import { Renderer } from './engine/Renderer.js';
import { ShapeEngine } from './engine/ShapeEngine.js';
import { EffectPipeline } from './engine/EffectPipeline.js';
import { XmlHandler } from './xml/XmlHandler.js';
import { StorageManager } from './storage/StorageManager.js';

import { GraphEditor } from './ui/GraphEditor.js';
import { ExpressionDialog } from './expressions/ExpressionEngine.js';
import { ThreeDLabs } from './labs/ThreeDLabs.js';
import { ToolStudio } from './tools/ToolStudio.js';
import { GoldMascot } from './mascot/GoldMascot.js';

class GoldMotionApp {
  constructor() {
    this.storage = new StorageManager();
    this.shapeEngine = new ShapeEngine();
    this.effectPipeline = new EffectPipeline();

    this.scene = null;
    this.timeline = null;
    this.renderer = null;

    this.currentLayerId = null;
    this.currentDrawerTab = 'transform';
    this.currentMainTab = 'projects';

    // Anti-loss Mandatory Export State (Strict requirement: both XML and Video must be exported)
    this.projectExportedXml = false;
    this.projectExportedVideo = false;

    this.canvas = document.getElementById('gmMainCanvas');
    this.init();
  }

  async init() {
    console.log('[Gold Motion Web] Booting native Android web runtime…');

    // 1. Initialize core engines
    await Promise.all([
      this.shapeEngine.init(),
      this.effectPipeline.init(),
      this.storage.initDB()
    ]);

    // 2. Initialize renderer & timeline clock
    this.renderer = new Renderer(this.canvas, this.effectPipeline, this.shapeEngine);
    this.timeline = new Timeline({
      fps: 30,
      totalTime: 10000,
      onTimeUpdate: (ms) => this.onTimeUpdate(ms),
      onStateChange: (isPlaying) => this.onPlayStateChange(isPlaying)
    });

    // 3. Initialize auxiliary tools
    this.initAuxiliaryTools();

    // 4. Bind all Android UI controls
    this.bindAndroidUI();

    // 5. Setup Anti-Close Mandatory Export Guard
    this.setupMandatoryExportGuard();

    // 6. Setup status bar clock
    this.startClock();

    // 7. Load initial project and render projects list
    await this.loadInitialProjectsList();

    console.log('[Gold Motion Web] Native UI running.');
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const el = document.getElementById('gmStatusTime');
      if (el) el.textContent = `${h}:${m}`;
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  initAuxiliaryTools() {
    // Bezier Graph Editor
    this.graphEditor = new GraphEditor(
      document.getElementById('gmGraphModalMount'),
      (curveStr) => this.onCurveApplied(curveStr)
    );

    // Expression Engine Dialog
    this.expressionDialog = new ExpressionDialog(
      document.getElementById('gmExprModalMount'),
      (prop, code, fps) => this.onExpressionApplied(prop, code, fps)
    );

    // 3D Labs Studio
    this.threeDLabs = new ThreeDLabs(
      document.getElementById('gmLabsPageRoot'),
      (layerData) => {
        if (this.scene) {
          const l = this.scene.createLayer('shape', layerData);
          this.scene.addLayer(l);
          this.showActivity('editor');
          this.selectLayer(l.id);
          this.markUnexported();
          this.render();
        }
      }
    );

    // Extra Tools Studio
    this.toolStudio = new ToolStudio(
      document.getElementById('gmToolsPageRoot'),
      () => {}
    );

    // Mascot
    this.mascot = new GoldMascot(
      document.getElementById('gmMascotMount')
    );
  }

  // ==========================================================
  // MANDATORY EXPORT GUARD IMPLEMENTATION
  // ("you can't close the tab without export your project in XML and video")
  // ==========================================================
  setupMandatoryExportGuard() {
    // 1. Browser Native Tab Close / Refresh Interception
    window.addEventListener('beforeunload', (e) => {
      if (this.scene && (!this.projectExportedXml || !this.projectExportedVideo)) {
        e.preventDefault();
        e.returnValue = 'Gold Motion Alert: You have not exported your project in both XML and Video format! Please export before leaving to prevent data loss.';
        this.openExportGuardModal();
        return e.returnValue;
      }
    });

    // 2. Export Guard Pill click in editor header
    document.getElementById('gmExportGuardPill')?.addEventListener('click', () => {
      this.openExportGuardModal();
    });

    // 3. Export XML button in modal
    document.getElementById('gmGuardExportXmlBtn')?.addEventListener('click', async () => {
      await this.exportProjectXml();
    });

    // 4. Render Video button in modal
    document.getElementById('gmGuardExportVideoBtn')?.addEventListener('click', async () => {
      await this.exportProjectVideo();
    });

    // 5. 1-Click Master Export: EXPORT ALL (XML + VIDEO) NOW
    document.getElementById('gmGuardExportBothBtn')?.addEventListener('click', async () => {
      await this.exportBothXmlAndVideo();
    });

    // 6. Return to Editor button
    document.getElementById('gmGuardKeepEditingBtn')?.addEventListener('click', () => {
      this.closeExportGuardModal();
    });

    // 7. Safe to Exit button (only active after both are exported)
    document.getElementById('gmGuardSafeExitBtn')?.addEventListener('click', () => {
      this.closeExportGuardModal();
      this.showActivity('main');
    });
  }

  markUnexported() {
    this.projectExportedXml = false;
    this.projectExportedVideo = false;
    this.updateExportGuardUI();
    if (this.scene) {
      this.storage.saveProject(this.scene);
    }
  }

  updateExportGuardUI() {
    const pill = document.getElementById('gmExportGuardPill');
    const pillText = document.getElementById('gmExportGuardPillText');
    const itemXml = document.getElementById('gmGuardItemXml');
    const iconXml = document.getElementById('gmGuardIconXml');
    const statusXml = document.getElementById('gmGuardStatusXml');
    const itemVid = document.getElementById('gmGuardItemVideo');
    const iconVid = document.getElementById('gmGuardIconVideo');
    const statusVid = document.getElementById('gmGuardStatusVideo');
    const banner = document.getElementById('gmGuardSuccessBanner');
    const safeExitBtn = document.getElementById('gmGuardSafeExitBtn');

    // XML status
    if (this.projectExportedXml) {
      itemXml?.classList.add('done');
      if (iconXml) iconXml.textContent = '✅';
      if (statusXml) statusXml.textContent = 'Exported & Downloaded (.xml)';
    } else {
      itemXml?.classList.remove('done');
      if (iconXml) iconXml.textContent = '❌';
      if (statusXml) statusXml.textContent = 'Not exported yet';
    }

    // Video status
    if (this.projectExportedVideo) {
      itemVid?.classList.add('done');
      if (iconVid) iconVid.textContent = '✅';
      if (statusVid) statusVid.textContent = 'Rendered & Downloaded (.webm)';
    } else {
      itemVid?.classList.remove('done');
      if (iconVid) iconVid.textContent = '❌';
      if (statusVid) statusVid.textContent = 'Not rendered yet';
    }

    // Combined state
    const bothExported = this.projectExportedXml && this.projectExportedVideo;
    if (bothExported) {
      pill?.classList.add('saved');
      if (pillText) pillText.textContent = '✅ Saved & Exported';
      if (banner) banner.style.display = 'block';
      if (safeExitBtn) safeExitBtn.style.display = 'block';
    } else {
      pill?.classList.remove('saved');
      const xmlStat = this.projectExportedXml ? 'XML: ✅' : 'XML: ❌';
      const vidStat = this.projectExportedVideo ? 'Video: ✅' : 'Video: ❌';
      if (pillText) pillText.textContent = `🔒 ${xmlStat} | ${vidStat}`;
      if (banner) banner.style.display = 'none';
      if (safeExitBtn) safeExitBtn.style.display = 'none';
    }
  }

  openExportGuardModal() {
    this.updateExportGuardUI();
    const modal = document.getElementById('gmExportGuardModal');
    if (modal) modal.classList.add('active');
  }

  closeExportGuardModal() {
    const modal = document.getElementById('gmExportGuardModal');
    if (modal) modal.classList.remove('active');
  }

  // XML Export Engine
  async exportProjectXml() {
    if (!this.scene) return;
    try {
      const xmlString = XmlHandler.serialize(this.scene);
      const blob = new Blob([xmlString], { type: 'application/xml' });
      const filename = `${(this.scene.title || 'Gold_Motion').replace(/\s+/g, '_')}.xml`;
      this.triggerDownload(blob, filename);

      this.projectExportedXml = true;
      this.updateExportGuardUI();
      console.log(`[Gold Motion] XML Project exported: ${filename}`);
    } catch (e) {
      console.error('[Gold Motion] XML export error:', e);
      alert('Error exporting XML: ' + e.message);
    }
  }

  // Video Frame-by-Frame Render Engine
  async exportProjectVideo() {
    if (!this.scene || !this.renderer) return;

    const progressWrap = document.getElementById('gmGuardProgressWrap');
    const progressFill = document.getElementById('gmGuardProgressFill');
    const progressLabel = document.getElementById('gmGuardProgressLabel');
    const progressPercent = document.getElementById('gmGuardProgressPercent');
    const exportBtn = document.getElementById('gmGuardExportVideoBtn');
    const masterBtn = document.getElementById('gmGuardExportBothBtn');

    if (progressWrap) progressWrap.style.display = 'block';
    if (exportBtn) exportBtn.disabled = true;
    if (masterBtn) masterBtn.disabled = true;

    try {
      const fps = this.scene.fps || 30;
      const totalFrames = Math.max(1, Math.floor((this.scene.totalTime / 1000) * fps));
      const canvas = this.renderer.canvas;

      const stream = canvas.captureStream(fps);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const chunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 10000000 // 10 Mbps Pro Quality
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();

      // Render every frame sequentially
      for (let f = 0; f <= totalFrames; f++) {
        const timeMs = (f / fps) * 1000;
        this.renderer.render(this.scene, timeMs);

        const pct = Math.floor((f / totalFrames) * 100);
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressPercent) progressPercent.textContent = `${pct}%`;
        if (progressLabel) progressLabel.textContent = `Rendering frame ${f} of ${totalFrames} (${pct}%)`;

        // Small tick for canvas capture
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }

      await new Promise((resolve) => {
        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: mime });
          const filename = `${(this.scene.title || 'Gold_Motion').replace(/\s+/g, '_')}_rendered.webm`;
          this.triggerDownload(videoBlob, filename);
          resolve();
        };
        recorder.stop();
      });

      this.projectExportedVideo = true;
      this.updateExportGuardUI();
      console.log('[Gold Motion] Video rendered and downloaded successfully.');
    } catch (e) {
      console.error('[Gold Motion] Video export error:', e);
      alert('Error rendering video: ' + e.message);
    } finally {
      if (progressWrap) progressWrap.style.display = 'none';
      if (exportBtn) exportBtn.disabled = false;
      if (masterBtn) masterBtn.disabled = false;
    }
  }

  // 1-Click Dual Export (XML + Video)
  async exportBothXmlAndVideo() {
    await this.exportProjectXml();
    await this.exportProjectVideo();
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ==========================================================
  // NATIVE ANDROID UI ROUTING & EVENT BINDINGS
  // ==========================================================
  bindAndroidUI() {
    // 1. Header Tabs: Home, Projects, Elements
    const tabHome = document.getElementById('gmTabHome');
    const tabProjects = document.getElementById('gmTabProjects');
    const tabElements = document.getElementById('gmTabElements');

    tabHome?.addEventListener('click', () => this.switchMainTab('home'));
    tabProjects?.addEventListener('click', () => this.switchMainTab('projects'));
    tabElements?.addEventListener('click', () => this.switchMainTab('elements'));

    // 2. Side Menu Drawer (hamburger button)
    document.getElementById('gmButtonSideMenu')?.addEventListener('click', () => {
      document.getElementById('gmSideMenuScrim')?.classList.add('active');
    });
    document.getElementById('gmCloseSideMenu')?.addEventListener('click', () => {
      document.getElementById('gmSideMenuScrim')?.classList.remove('active');
    });
    document.getElementById('gmSideMenuScrim')?.addEventListener('click', (e) => {
      if (e.target.id === 'gmSideMenuScrim') {
        document.getElementById('gmSideMenuScrim')?.classList.remove('active');
      }
    });

    // Side Menu items
    document.getElementById('gmSideMenuOpenLabs')?.addEventListener('click', () => {
      document.getElementById('gmSideMenuScrim')?.classList.remove('active');
      this.threeDLabs.open();
    });
    document.getElementById('gmSideMenuOpenTools')?.addEventListener('click', () => {
      document.getElementById('gmSideMenuScrim')?.classList.remove('active');
      this.toolStudio.open();
    });
    document.getElementById('gmBackupNowBtn')?.addEventListener('click', () => {
      this.storage.downloadFullBackup();
    });

    // 3. Overflow button
    document.getElementById('gmButtonOverflow')?.addEventListener('click', () => {
      document.getElementById('gmSideMenuScrim')?.classList.add('active');
    });

    // 4. Floating Action Button [+] Create Project
    document.getElementById('gmNewProjectFab')?.addEventListener('click', () => {
      this.openCreateProjectModal();
    });

    // Create Project modal events
    document.getElementById('gmButtonCancelCreate')?.addEventListener('click', () => {
      this.closeCreateProjectModal();
    });
    document.getElementById('gmClearProjectTitleBtn')?.addEventListener('click', () => {
      const input = document.getElementById('gmNewProjectTitle');
      if (input) input.value = '';
    });

    // Aspect ratio selector
    document.querySelectorAll('#gmAspectRow .gm-aspect-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#gmAspectRow .gm-aspect-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Create project button submit
    document.getElementById('gmButtonCreateProject')?.addEventListener('click', () => {
      this.handleCreateProjectSubmit();
    });

    // 5. Editor Activity Nav Bar
    document.getElementById('gmExitToProjectList')?.addEventListener('click', () => {
      if (!this.projectExportedXml || !this.projectExportedVideo) {
        // Enforce export before exiting to project list
        this.openExportGuardModal();
      } else {
        this.showActivity('main');
        this.loadInitialProjectsList();
      }
    });

    document.getElementById('gmProjectTitleInputNav')?.addEventListener('input', (e) => {
      if (this.scene) {
        this.scene.title = e.target.value;
        this.markUnexported();
      }
    });

    document.getElementById('gmButtonExport')?.addEventListener('click', () => {
      this.openExportGuardModal();
    });

    document.getElementById('gmProjectSettings')?.addEventListener('click', () => {
      this.openCreateProjectModal(true);
    });

    // 6. Preview controls
    document.getElementById('gmResetZoomBtn')?.addEventListener('click', () => {
      this.renderer?.resetZoom();
      this.render();
    });
    document.getElementById('gmToggleGridBtn')?.addEventListener('click', () => {
      if (this.renderer) {
        this.renderer.showGrid = !this.renderer.showGrid;
        this.render();
      }
    });

    // 7. Transport & Playbar
    document.getElementById('gmButtonPlay')?.addEventListener('click', () => {
      this.timeline.toggle();
    });
    document.getElementById('gmButtonUndo')?.addEventListener('click', () => {
      if (this.scene) {
        this.scene.undo();
        this.markUnexported();
        this.updateTimelineUI();
        this.updatePropertiesUI();
        this.render();
      }
    });
    document.getElementById('gmButtonRedo')?.addEventListener('click', () => {
      if (this.scene) {
        this.scene.redo();
        this.markUnexported();
        this.updateTimelineUI();
        this.updatePropertiesUI();
        this.render();
      }
    });
    document.getElementById('gmButtonSkipBack')?.addEventListener('click', () => {
      this.timeline.seekFrame(-1);
    });
    document.getElementById('gmButtonSkipFwd')?.addEventListener('click', () => {
      this.timeline.seekFrame(1);
    });
    document.getElementById('gmButtonLayers')?.addEventListener('click', () => {
      this.toggleKeyframeAtCurrentTime();
    });

    // 8. Timeline Ruler Scrubbing
    const ruler = document.getElementById('gmRuler');
    if (ruler) {
      let isScrubbing = false;
      const scrub = (e) => {
        const rect = ruler.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.timeline.seek(p * this.timeline.totalTime);
      };
      ruler.addEventListener('pointerdown', (e) => {
        isScrubbing = true;
        scrub(e);
      });
      window.addEventListener('pointermove', (e) => {
        if (isScrubbing) scrub(e);
      });
      window.addEventListener('pointerup', () => (isScrubbing = false));
    }

    // 9. Floating Add Layer Button [+]
    document.getElementById('gmButtonAddLayer')?.addEventListener('click', () => {
      this.openAddLayerSheet();
    });
    document.getElementById('gmButtonCloseAdd')?.addEventListener('click', () => {
      this.closeAddLayerSheet();
    });

    // Add Sheet Tabs
    document.querySelectorAll('#gmElementTabHolder .gm-add-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.addTab;
        document.querySelectorAll('#gmElementTabHolder .gm-add-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.gm-add-page').forEach((p) => p.classList.remove('active'));
        if (target === 'shape') document.getElementById('gmAddPageShape')?.classList.add('active');
        if (target === 'media') document.getElementById('gmAddPageMedia')?.classList.add('active');
        if (target === 'audio') document.getElementById('gmAddPageAudio')?.classList.add('active');
        if (target === 'objects') document.getElementById('gmAddPageObjects')?.classList.add('active');
        if (target === 'templates') document.getElementById('gmAddPageTemplates')?.classList.add('active');
      });
    });

    // Quick Add Buttons
    document.getElementById('gmBtnQuickText')?.addEventListener('click', () => {
      this.addTextLayer();
      this.closeAddLayerSheet();
    });
    document.getElementById('gmBtnQuickDraw')?.addEventListener('click', () => {
      this.addShapeLayer('path');
      this.closeAddLayerSheet();
    });
    document.getElementById('gmBtnQuickVector')?.addEventListener('click', () => {
      this.addShapeLayer('vector');
      this.closeAddLayerSheet();
    });

    // Primitives in Objects Tab
    document.getElementById('gmAddObjCamera')?.addEventListener('click', () => {
      this.addCameraLayer();
      this.closeAddLayerSheet();
    });
    document.getElementById('gmAddObjNull')?.addEventListener('click', () => {
      this.addNullLayer();
      this.closeAddLayerSheet();
    });
    document.getElementById('gmAddObjLight')?.addEventListener('click', () => {
      this.addLightLayer();
      this.closeAddLayerSheet();
    });
    document.getElementById('gmAddObjGroup')?.addEventListener('click', () => {
      this.addGroupLayer();
      this.closeAddLayerSheet();
    });

    // File pickers in Add Sheet
    document.getElementById('gmMediaFileInput')?.addEventListener('change', (e) => {
      this.handleMediaUpload(e.target.files[0]);
    });
    document.getElementById('gmAudioFileInput')?.addEventListener('change', (e) => {
      this.handleAudioUpload(e.target.files[0]);
    });

    // XML Import
    document.getElementById('gmXmlImportInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        const scene = XmlHandler.parse(text);
        await this.storage.saveProject(scene);
        this.loadScene(scene);
        this.showActivity('editor');
        document.getElementById('gmSideMenuScrim')?.classList.remove('active');
      }
    });

    // Home card buttons
    document.getElementById('gmLoadSampleBtn')?.addEventListener('click', async () => {
      await this.loadSampleBetaAnim();
    });
    document.getElementById('gmOpenLabsFromHome')?.addEventListener('click', () => {
      this.threeDLabs.open();
    });
    document.getElementById('gmOpenToolsFromHome')?.addEventListener('click', () => {
      this.toolStudio.open();
    });

    // 10. Layer Drawer Tabs & Pan Trackpad
    document.querySelectorAll('.gm-drawer-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.drawerTab;
        this.switchDrawerTab(target);
      });
    });
    document.getElementById('gmDrawerClose')?.addEventListener('click', () => {
      document.getElementById('gmLayerDrawer')?.classList.remove('active');
    });

    // Pan Trackpad Drag
    this.setupPanTrackpad();

    // Transform Sliders
    this.setupTransformSliders();

    // Color Swatches
    this.setupColorPalette();

    // Border & Shadow
    this.setupBorderAndShadow();

    // Blending & Opacity
    this.setupBlendingAndOpacity();

    // Add Effect Modal Button
    document.getElementById('gmOpenAddEffectModalBtn')?.addEventListener('click', () => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) this.openEffectCatalogModal(layer);
    });

    // Custom XML Effects Modal & Importer
    this.setupCustomXmlModal();
  }

  switchMainTab(tab) {
    this.currentMainTab = tab;
    const underline = document.getElementById('gmTabUnderline');
    const tabs = ['home', 'projects', 'elements'];
    const idx = tabs.indexOf(tab);

    if (underline && idx !== -1) {
      underline.style.left = `${idx * 33.333}%`;
    }

    document.querySelectorAll('.gm-tab-item').forEach((t) => t.classList.remove('active'));
    if (tab === 'home') document.getElementById('gmTabHome')?.classList.add('active');
    if (tab === 'projects') document.getElementById('gmTabProjects')?.classList.add('active');
    if (tab === 'elements') document.getElementById('gmTabElements')?.classList.add('active');

    document.querySelectorAll('.gm-pager-view').forEach((v) => v.classList.remove('active'));
    if (tab === 'home') document.getElementById('gmViewHome')?.classList.add('active');
    if (tab === 'projects') {
      document.getElementById('gmViewProjects')?.classList.add('active');
      this.loadInitialProjectsList();
    }
    if (tab === 'elements') document.getElementById('gmViewElements')?.classList.add('active');
  }

  showActivity(activityName) {
    document.querySelectorAll('.gm-activity').forEach((a) => a.classList.remove('active'));
    if (activityName === 'main') {
      document.getElementById('gmMainActivity')?.classList.add('active');
    } else if (activityName === 'editor') {
      document.getElementById('gmEditorActivity')?.classList.add('active');
    }
  }

  // ==========================================================
  // PROJECTS LIST & INITIAL DATA
  // ==========================================================
  async loadInitialProjectsList() {
    const grid = document.getElementById('gmProjectsGrid');
    if (!grid) return;

    const projects = await this.storage.getAllProjects();
    if (!projects || projects.length === 0) {
      grid.innerHTML = `
        <div class="gm-empty-state" style="grid-column: 1 / -1;">
          <div class="gm-empty-icon">📁</div>
          <h4>No Projects Yet</h4>
          <p>Tap the gold [+] button at the bottom right to start your first motion graphics project!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = projects
      .map((proj) => {
        const aspect = `${proj.width > proj.height ? '16:9' : proj.height > proj.width ? '9:16' : '1:1'} ${proj.height}p`;
        const durationSec = ((proj.totalTime || 10000) / 1000).toFixed(1);
        const lastEdited = new Date(proj.updatedAt || Date.now()).toLocaleDateString();

        return `
          <div class="gm-project-card" data-proj-id="${proj.id}">
            <div class="gm-card-thumb-wrap">
              <div style="font-size: 32px; color: var(--gm-gold-primary); opacity: 0.8;">🎬</div>
              <div class="gm-card-badge">${aspect}</div>
              <div class="gm-card-duration">00:0${durationSec}</div>
            </div>
            <div class="gm-card-info">
              <div class="gm-card-title-group">
                <h4>${proj.title || 'Untitled Project'}</h4>
                <p>Edited ${lastEdited}</p>
              </div>
              <button class="gm-card-menu-btn" data-action="delete-proj" data-proj-id="${proj.id}" title="Delete Project">
                ✕
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    grid.querySelectorAll('.gm-project-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete-proj"]')) {
          e.stopPropagation();
          const id = e.target.closest('[data-action="delete-proj"]').dataset.projId;
          if (confirm('Delete this project?')) {
            this.storage.deleteProject(id).then(() => this.loadInitialProjectsList());
          }
          return;
        }
        const id = card.dataset.projId;
        this.openProject(id);
      });
    });
  }

  async openProject(id) {
    const proj = await this.storage.getProject(id);
    if (proj) {
      this.loadScene(new Scene(proj));
      this.showActivity('editor');
    }
  }

  async loadSampleBetaAnim() {
    try {
      const res = await fetch('./assets/hometab/beta_anim.xml');
      if (res.ok) {
        const xml = await res.text();
        const scene = XmlHandler.parse(xml);
        scene.title = 'Beta Anim Showcase';
        await this.storage.saveProject(scene);
        this.loadScene(scene);
        this.showActivity('editor');
      }
    } catch (e) {
      console.warn('[Gold Motion] Could not load sample XML:', e);
    }
  }

  // ==========================================================
  // CREATE PROJECT FLOW (activity_project_list_addpopup_large.xml)
  // ==========================================================
  openCreateProjectModal(isSettings = false) {
    const modal = document.getElementById('gmCreateProjectModal');
    if (!modal) return;
    modal.classList.add('active');

    const titleInput = document.getElementById('gmNewProjectTitle');
    const submitBtn = document.getElementById('gmButtonCreateProject');

    if (isSettings && this.scene) {
      if (titleInput) titleInput.value = this.scene.title;
      if (submitBtn) submitBtn.textContent = 'Save Settings';
    } else {
      if (titleInput) titleInput.value = `Project ${(Math.floor(Math.random() * 90) + 10)}`;
      if (submitBtn) submitBtn.textContent = 'Create project';
    }
  }

  closeCreateProjectModal() {
    const modal = document.getElementById('gmCreateProjectModal');
    if (modal) modal.classList.remove('active');
  }

  handleCreateProjectSubmit() {
    const titleInput = document.getElementById('gmNewProjectTitle');
    const resSelect = document.getElementById('gmSelectResolution');
    const fpsSelect = document.getElementById('gmSelectFps');
    const bgSelect = document.getElementById('gmSelectBgColor');
    const activeAspectBtn = document.querySelector('#gmAspectRow .gm-aspect-btn.active');

    const aspect = activeAspectBtn?.dataset.aspect || '16:9';
    const res = parseInt(resSelect?.value || '1080');
    const fps = parseInt(fpsSelect?.value || '30');
    const bgcolor = bgSelect?.value || '#000000';
    const title = titleInput?.value.trim() || 'Project 1';

    let width = 1920;
    let height = 1080;

    if (aspect === '16:9') {
      height = res;
      width = Math.round((res * 16) / 9);
    } else if (aspect === '9:16') {
      width = res;
      height = Math.round((res * 16) / 9);
    } else if (aspect === '1:1') {
      width = res;
      height = res;
    } else if (aspect === '4:3') {
      height = res;
      width = Math.round((res * 4) / 3);
    } else if (aspect === '4:5') {
      width = res;
      height = Math.round((res * 5) / 4);
    }

    const scene = new Scene({
      title,
      width,
      height,
      bgcolor,
      totalTime: 10000,
      fps
    });

    // Add default Gold Motion Title Layer
    scene.addLayer(
      scene.createLayer('text', {
        label: 'Gold Motion Title',
        tag: 'gold',
        content: title.toUpperCase(),
        fontSize: Math.round(width * 0.05),
        font: 'Audiowide',
        fillColor: '#f6c945',
        location: [width / 2, height / 2],
        scale: [1, 1],
        rotation: 0
      })
    );

    this.loadScene(scene);
    this.closeCreateProjectModal();
    this.showActivity('editor');
    this.markUnexported();
  }

  // ==========================================================
  // SCENE & TIMELINE STATE
  // ==========================================================
  loadScene(scene) {
    this.scene = scene;
    this.timeline.totalTime = scene.totalTime;
    this.timeline.fps = scene.fps;
    this.timeline.currentTime = 0;

    // Reset export flags for freshly loaded scene
    this.projectExportedXml = false;
    this.projectExportedVideo = false;
    this.updateExportGuardUI();

    const titleInput = document.getElementById('gmProjectTitleInputNav');
    if (titleInput) titleInput.value = scene.title || 'Gold Motion';

    // Populate shapes grid in Add Sheet
    this.populateShapesGrid();

    if (scene.layers.length > 0) {
      this.selectLayer(scene.layers[0].id);
    } else {
      this.selectLayer(null);
    }

    this.updateTimelineUI();
    this.render();
  }

  selectLayer(layerId) {
    this.currentLayerId = layerId;
    const drawer = document.getElementById('gmLayerDrawer');
    const overlay = document.getElementById('gmTransformOverlay');

    if (layerId && this.scene) {
      drawer?.classList.add('active');
      overlay ? (overlay.style.display = 'block') : null;
      this.updatePropertiesUI();
    } else {
      drawer?.classList.remove('active');
      overlay ? (overlay.style.display = 'none') : null;
    }

    this.updateTimelineUI();
    this.render();
  }

  onTimeUpdate(ms) {
    const tcEl = document.getElementById('gmTimecode');
    if (tcEl) tcEl.textContent = this.timeline.formatTimecode(ms);

    const lanesWrap = document.getElementById('gmTimelineLanesWrap');
    const playhead = document.getElementById('gmPlayheadLine');
    if (lanesWrap && playhead && this.scene) {
      const w = lanesWrap.scrollWidth || 1000;
      const x = (ms / this.scene.totalTime) * w;
      playhead.style.transform = `translateX(${x}px)`;
    }

    this.render();
  }

  onPlayStateChange(isPlaying) {
    const btn = document.getElementById('gmButtonPlay');
    if (btn) {
      btn.innerHTML = isPlaying
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8.4,5.55C8.4,4.75 9.28,4.27 9.95,4.7L19.25,10.65C19.87,11.05 19.87,11.95 19.25,12.35L9.95,18.3C9.28,18.73 8.4,18.25 8.4,17.45Z"/></svg>`;
    }
  }

  render() {
    if (!this.scene || !this.renderer) return;
    this.renderer.selectedLayerId = this.currentLayerId;
    this.renderer.render(this.scene, this.timeline.currentTime);
  }

  // ==========================================================
  // TIMELINE UI (Headers, Clips, Diamonds)
  // ==========================================================
  updateTimelineUI() {
    const headersList = document.getElementById('gmTrackHeadersList');
    const lanesList = document.getElementById('gmLanesList');
    if (!headersList || !lanesList || !this.scene) return;

    headersList.innerHTML = this.scene.layers
      .map((l) => {
        const isSel = l.id === this.currentLayerId;
        return `
          <div class="gm-track-header-row ${isSel ? 'active' : ''}" data-lid="${l.id}">
            <svg class="gm-track-eye ${l.visible ? 'on' : ''}" data-action="toggle-vis" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${
                l.visible
                  ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                  : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
              }
            </svg>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${l.label}</span>
          </div>
        `;
      })
      .join('');

    lanesList.innerHTML = this.scene.layers
      .map((l) => {
        const isSel = l.id === this.currentLayerId;
        const leftPct = (l.startTime / this.scene.totalTime) * 100;
        const widthPct = Math.max(3, ((l.endTime - l.startTime) / this.scene.totalTime) * 100);

        let kfDiamonds = '';
        if (l.transform?.keyframes) {
          for (const [, kfList] of Object.entries(l.transform.keyframes)) {
            if (!Array.isArray(kfList)) continue;
            for (const kf of kfList) {
              const kfLeft = kf.t * 100;
              kfDiamonds += `<div class="gm-kf-diamond" style="left: ${kfLeft}%;"></div>`;
            }
          }
        }

        return `
          <div class="gm-track-lane" data-lid="${l.id}">
            <div class="gm-clip-bar ${isSel ? 'active' : ''}" style="left: ${leftPct}%; width: ${widthPct}%;">
              <span>${l.label}</span>
              ${kfDiamonds}
            </div>
          </div>
        `;
      })
      .join('');

    headersList.querySelectorAll('.gm-track-header-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        const lid = row.dataset.lid;
        if (e.target.closest('[data-action="toggle-vis"]')) {
          const l = this.scene.getLayer(lid);
          if (l) l.visible = !l.visible;
          this.updateTimelineUI();
          this.render();
          return;
        }
        this.selectLayer(lid);
      });
    });

    lanesList.querySelectorAll('.gm-track-lane').forEach((lane) => {
      lane.addEventListener('click', () => {
        this.selectLayer(lane.dataset.lid);
      });
    });
  }

  // ==========================================================
  // LAYER PROPERTIES BOTTOM DRAWER
  // ==========================================================
  switchDrawerTab(tab) {
    this.currentDrawerTab = tab;
    document.querySelectorAll('.gm-drawer-tab').forEach((t) => t.classList.remove('active'));
    document.querySelector(`.gm-drawer-tab[data-drawer-tab="${tab}"]`)?.classList.add('active');

    document.querySelectorAll('.gm-drawer-panel').forEach((p) => p.classList.remove('active'));
    if (tab === 'transform') document.getElementById('gmPanelTransform')?.classList.add('active');
    if (tab === 'color') document.getElementById('gmPanelColor')?.classList.add('active');
    if (tab === 'border') document.getElementById('gmPanelBorder')?.classList.add('active');
    if (tab === 'blending') document.getElementById('gmPanelBlending')?.classList.add('active');
    if (tab === 'effects') document.getElementById('gmPanelEffects')?.classList.add('active');
  }

  updatePropertiesUI() {
    const layer = this.scene?.getLayer(this.currentLayerId);
    if (!layer) return;

    // Transform
    const loc = layer.transform?.location || [this.scene.width / 2, this.scene.height / 2];
    const rot = layer.transform?.rotation || 0;
    const scale = layer.transform?.scale || [1, 1];

    const posX = document.getElementById('gmTransformPosX');
    const posY = document.getElementById('gmTransformPosY');
    const rotSlider = document.getElementById('gmSliderRotate');
    const rotVal = document.getElementById('gmValRotate');
    const scaleSlider = document.getElementById('gmSliderScale');
    const scaleVal = document.getElementById('gmValScale');

    if (posX) posX.value = Math.round(loc[0]);
    if (posY) posY.value = Math.round(loc[1]);
    if (rotSlider) rotSlider.value = rot;
    if (rotVal) rotVal.textContent = `${Math.round(rot)}°`;
    if (scaleSlider) scaleSlider.value = scale[0];
    if (scaleVal) scaleVal.textContent = `${scale[0].toFixed(1)}x`;

    // Keyframe diamond active state
    const kfBtn = document.getElementById('gmKfDiamondToggle');
    const hasKf = !!layer.transform?.keyframes?.location;
    if (kfBtn) kfBtn.classList.toggle('active', hasKf);

    // Color
    const hexInput = document.getElementById('gmHexColorInput');
    const colorPicker = document.getElementById('gmCustomColorPicker');
    if (hexInput && layer.fillColor) hexInput.value = layer.fillColor;
    if (colorPicker && layer.fillColor) colorPicker.value = layer.fillColor.slice(0, 7);

    // Opacity
    const opSlider = document.getElementById('gmOpacitySlider');
    const opVal = document.getElementById('gmOpacityVal');
    const op = layer.transform?.opacity !== undefined ? layer.transform.opacity : 1;
    if (opSlider) opSlider.value = op;
    if (opVal) opVal.textContent = `${Math.round(op * 100)}%`;

    // Effects Stack List
    this.renderEffectsStackList(layer);
  }

  renderEffectsStackList(layer) {
    const list = document.getElementById('gmLayerEffectsList');
    if (!list) return;

    if (!layer.effects || layer.effects.length === 0) {
      list.innerHTML = `<p style="font-size: 11.5px; color: var(--gm-text-muted); text-align: center; padding: 12px 0;">No effects applied. Tap [+ Add Effect] or [📥 Add XML Effect] above.</p>`;
      return;
    }

    list.innerHTML = layer.effects
      .map((eff, idx) => {
        const effDef = this.effectPipeline.getEffect(eff.id);
        const isCustom = eff.isCustomXml || effDef?.isCustomXml;
        let displayName = effDef ? effDef.name : eff.id.replace('com.alightcreative.effects.', '').replace('com.goldmotion.custom.', '');
        return `
          <div class="gm-effect-stack-item">
            <span style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span>${isCustom ? '⭐' : '✨'}</span>
              <strong style="color: ${isCustom ? 'var(--gm-gold-primary)' : '#fff'}; font-size: 12px;">${displayName}</strong>
              ${isCustom ? '<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(246,201,69,0.2); color: var(--gm-gold-primary); font-weight: 700; border: 1px solid rgba(246,201,69,0.4);">XML</span>' : ''}
            </span>
            <button class="gm-icon-btn" data-del-eff="${idx}" style="width: 28px; height: 28px; color: #ef4444;" title="Delete Effect">✕</button>
          </div>
        `;
      })
      .join('');

    list.querySelectorAll('[data-del-eff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.delEff);
        layer.effects.splice(idx, 1);
        this.markUnexported();
        this.renderEffectsStackList(layer);
        this.render();
      });
    });
  }

  setupPanTrackpad() {
    const pad = document.getElementById('gmPanTrackpad');
    if (!pad) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origLoc = [0, 0];

    pad.addEventListener('pointerdown', (e) => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (!layer) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origLoc = [...(layer.transform.location || [this.scene.width / 2, this.scene.height / 2])];
      pad.setPointerCapture(e.pointerId);
    });

    pad.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (!layer) return;

      const dx = (e.clientX - startX) * 2;
      const dy = (e.clientY - startY) * 2;

      layer.transform.location = [origLoc[0] + dx, origLoc[1] + dy];

      const posX = document.getElementById('gmTransformPosX');
      const posY = document.getElementById('gmTransformPosY');
      if (posX) posX.value = Math.round(layer.transform.location[0]);
      if (posY) posY.value = Math.round(layer.transform.location[1]);

      this.markUnexported();
      this.render();
    });

    const stopDrag = () => (isDragging = false);
    pad.addEventListener('pointerup', stopDrag);
    pad.addEventListener('pointercancel', stopDrag);
  }

  setupTransformSliders() {
    const posX = document.getElementById('gmTransformPosX');
    const posY = document.getElementById('gmTransformPosY');
    const rotSlider = document.getElementById('gmSliderRotate');
    const rotVal = document.getElementById('gmValRotate');
    const scaleSlider = document.getElementById('gmSliderScale');
    const scaleVal = document.getElementById('gmValScale');

    const update = () => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (!layer) return;

      if (posX && posY) layer.transform.location = [parseFloat(posX.value) || 0, parseFloat(posY.value) || 0];
      if (rotSlider) {
        layer.transform.rotation = parseFloat(rotSlider.value) || 0;
        if (rotVal) rotVal.textContent = `${Math.round(layer.transform.rotation)}°`;
      }
      if (scaleSlider) {
        const s = parseFloat(scaleSlider.value) || 1;
        layer.transform.scale = [s, s];
        if (scaleVal) scaleVal.textContent = `${s.toFixed(1)}x`;
      }

      this.markUnexported();
      this.render();
    };

    [posX, posY, rotSlider, scaleSlider].forEach((el) => el?.addEventListener('input', update));

    // Diamond keyframe toggle
    document.getElementById('gmKfDiamondToggle')?.addEventListener('click', () => {
      this.toggleKeyframeAtCurrentTime();
    });

    // Graph & Expression buttons
    document.getElementById('gmOpenCurveGraphBtn')?.addEventListener('click', () => {
      this.graphEditor?.open();
    });
    document.getElementById('gmOpenExprDialogBtn')?.addEventListener('click', () => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) this.expressionDialog?.open(layer);
    });
  }

  toggleKeyframeAtCurrentTime() {
    const layer = this.scene?.getLayer(this.currentLayerId);
    if (!layer) return;

    const currLoc = layer.transform.location || [this.scene.width / 2, this.scene.height / 2];
    this.scene.addKeyframe(layer.id, 'location', this.timeline.currentTime, currLoc);

    this.markUnexported();
    this.updateTimelineUI();
    this.updatePropertiesUI();
    this.render();
  }

  setupColorPalette() {
    document.querySelectorAll('#gmPresetPalette .gm-color-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('#gmPresetPalette .gm-color-swatch').forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');

        const col = swatch.dataset.color;
        const layer = this.scene?.getLayer(this.currentLayerId);
        if (layer) {
          layer.fillColor = col;
          const hexInput = document.getElementById('gmHexColorInput');
          if (hexInput) hexInput.value = col;
          this.markUnexported();
          this.render();
        }
      });
    });

    document.getElementById('gmCustomColorPicker')?.addEventListener('input', (e) => {
      const col = e.target.value;
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) {
        layer.fillColor = col;
        const hexInput = document.getElementById('gmHexColorInput');
        if (hexInput) hexInput.value = col;
        this.markUnexported();
        this.render();
      }
    });

    document.getElementById('gmHexColorInput')?.addEventListener('change', (e) => {
      const col = e.target.value;
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) {
        layer.fillColor = col;
        this.markUnexported();
        this.render();
      }
    });
  }

  setupBorderAndShadow() {
    const slider = document.getElementById('gmStrokeWidthSlider');
    const valText = document.getElementById('gmStrokeWidthVal');
    const colorPicker = document.getElementById('gmStrokeColorPicker');
    const shadowToggle = document.getElementById('gmShadowToggle');

    slider?.addEventListener('input', (e) => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) {
        layer.strokeWidth = parseFloat(e.target.value) || 0;
        if (valText) valText.textContent = `${layer.strokeWidth}px`;
        this.markUnexported();
        this.render();
      }
    });

    colorPicker?.addEventListener('input', (e) => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) {
        layer.strokeColor = e.target.value;
        this.markUnexported();
        this.render();
      }
    });

    shadowToggle?.addEventListener('change', (e) => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) {
        layer.shadow = e.target.checked;
        this.markUnexported();
        this.render();
      }
    });
  }

  setupBlendingAndOpacity() {
    const blendSelect = document.getElementById('gmBlendModeSelect');
    const opSlider = document.getElementById('gmOpacitySlider');
    const opVal = document.getElementById('gmOpacityVal');

    blendSelect?.addEventListener('change', (e) => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) {
        layer.blendMode = e.target.value;
        this.markUnexported();
        this.render();
      }
    });

    opSlider?.addEventListener('input', (e) => {
      const layer = this.scene?.getLayer(this.currentLayerId);
      if (layer) {
        layer.transform.opacity = parseFloat(e.target.value);
        if (opVal) opVal.textContent = `${Math.round(layer.transform.opacity * 100)}%`;
        this.markUnexported();
        this.render();
      }
    });
  }

  // ==========================================================
  // ADD LAYER SHEET (activity_edit_addpopup.xml)
  // ==========================================================
  openAddLayerSheet() {
    document.getElementById('gmAddPopup')?.classList.add('active');
  }

  closeAddLayerSheet() {
    document.getElementById('gmAddPopup')?.classList.remove('active');
  }

  populateShapesGrid() {
    const grid = document.getElementById('gmShapesGrid');
    if (!grid) return;

    const shapes = [
      { id: 'rect', name: 'Rectangle', svg: '<rect x="3" y="6" width="22" height="16" rx="2"/>' },
      { id: 'round_rect', name: 'Round Rect', svg: '<rect x="3" y="6" width="22" height="16" rx="6"/>' },
      { id: 'circle', name: 'Circle', svg: '<circle cx="14" cy="14" r="11"/>' },
      { id: 'star', name: 'Star', svg: '<polygon points="14,2 17.5,9.5 25,10.5 19.5,15.5 21,23 14,19 7,23 8.5,15.5 3,10.5 10.5,9.5"/>' },
      { id: 'triangle', name: 'Triangle', svg: '<polygon points="14,3 25,23 3,23"/>' },
      { id: 'polygon', name: 'Hexagon', svg: '<polygon points="14,2 24,7.5 24,18.5 14,24 4,18.5 4,7.5"/>' },
      { id: 'heart', name: 'Heart', svg: '<path d="M14,23 C8,18 2,13 2,7 C2,3 5,1 8,1 C11,1 13,3 14,5 C15,3 17,1 20,1 C23,1 26,3 26,7 C26,13 20,18 14,23 Z"/>' },
      { id: 'arrow', name: 'Arrow', svg: '<polygon points="14,2 25,13 18,13 18,24 10,24 10,13 3,13"/>' }
    ];

    grid.innerHTML = shapes
      .map(
        (s) => `
        <div class="gm-shape-card" data-shape-type="${s.id}">
          <svg viewBox="0 0 28 26">${s.svg}</svg>
          <span>${s.name}</span>
        </div>
      `
      )
      .join('');

    grid.querySelectorAll('.gm-shape-card').forEach((card) => {
      card.addEventListener('click', () => {
        const type = card.dataset.shapeType;
        this.addShapeLayer(type);
        this.closeAddLayerSheet();
      });
    });
  }

  addShapeLayer(shapeType) {
    if (!this.scene) return;
    const l = this.scene.createLayer('shape', {
      label: `${shapeType.toUpperCase()}`,
      shapeType,
      tag: 'gold',
      fillColor: '#f6c945',
      location: [this.scene.width / 2, this.scene.height / 2],
      scale: [1, 1],
      rotation: 0
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.markUnexported();
    this.render();
  }

  addTextLayer() {
    if (!this.scene) return;
    const l = this.scene.createLayer('text', {
      label: 'Text Layer',
      content: 'GOLD MOTION',
      fontSize: 64,
      font: 'Audiowide',
      fillColor: '#ffffff',
      location: [this.scene.width / 2, this.scene.height / 2],
      scale: [1, 1],
      rotation: 0
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.markUnexported();
    this.render();
  }

  addCameraLayer() {
    if (!this.scene) return;
    const l = this.scene.createLayer('camera', {
      label: 'Camera 1',
      tag: 'blue',
      fov: 45
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.markUnexported();
    this.render();
  }

  addNullLayer() {
    if (!this.scene) return;
    const l = this.scene.createLayer('null', {
      label: 'Null 1',
      tag: 'purple'
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.markUnexported();
    this.render();
  }

  addLightLayer() {
    if (!this.scene) return;
    const l = this.scene.createLayer('light', {
      label: 'Point Light',
      tag: 'gold',
      intensity: 1.5,
      lightColor: '#ffea88'
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.markUnexported();
    this.render();
  }

  addGroupLayer() {
    if (!this.scene) return;
    const l = this.scene.createLayer('group', {
      label: 'Group 1',
      tag: 'green'
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.markUnexported();
    this.render();
  }

  handleMediaUpload(file) {
    if (!file || !this.scene) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video');

    const l = this.scene.createLayer(isVideo ? 'video' : 'image', {
      label: file.name.slice(0, 16),
      src: url,
      location: [this.scene.width / 2, this.scene.height / 2],
      scale: [1, 1],
      rotation: 0
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.closeAddLayerSheet();
    this.markUnexported();
    this.render();
  }

  handleAudioUpload(file) {
    if (!file || !this.scene) return;
    const url = URL.createObjectURL(file);
    const l = this.scene.createLayer('audio', {
      label: file.name.slice(0, 16),
      src: url,
      startTime: 0,
      endTime: this.scene.totalTime
    });
    this.scene.addLayer(l);
    this.selectLayer(l.id);
    this.closeAddLayerSheet();
    this.markUnexported();
    this.render();
  }

  // ==========================================================
  // EFFECT CATALOG MODAL (930+ Shaders)
  // ==========================================================
  openEffectCatalogModal(layer) {
    const modal = document.getElementById('gmEffectCatalogModal');
    if (!modal) return;
    modal.classList.add('active');

    const listContainer = document.getElementById('gmCatalogList');
    const searchInput = document.getElementById('gmCatalogSearch');
    const catRow = document.getElementById('gmCatalogCatRow');

    let currentCategory = 'all';

    const renderEffects = (query = '', cat = currentCategory) => {
      const list = this.effectPipeline.searchEffects(query, cat).slice(0, 80);
      if (list.length === 0) {
        listContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; color: var(--gm-text-muted); padding: 36px 16px;">
            <p style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 6px;">No effects found</p>
            <p style="font-size: 12px; margin-bottom: 14px;">Try searching for something else or import a custom XML effect file.</p>
            <button class="gm-btn gm-btn-gold" id="gmCatalogEmptyImportBtn" style="display: inline-block;">📥 Add XML Effect</button>
          </div>
        `;
        document.getElementById('gmCatalogEmptyImportBtn')?.addEventListener('click', () => {
          modal.classList.remove('active');
          document.getElementById('gmCustomXmlModal')?.classList.add('active');
        });
        return;
      }

      listContainer.innerHTML = list
        .map((eff) => {
          const isCustom = eff.isCustomXml || eff.category === 'custom_xml';
          return `
            <div class="gm-project-card" data-eff-id="${eff.id}" style="padding: 10px; cursor: pointer; border: ${isCustom ? '1px solid rgba(246, 201, 69, 0.45)' : '1px solid var(--gm-border-subtle)'}; background: ${isCustom ? 'rgba(246, 201, 69, 0.06)' : ''};">
              <div style="display: flex; gap: 8px; align-items: center;">
                <div style="width: 32px; height: 32px; border-radius: 6px; background: ${isCustom ? 'rgba(246,201,69,0.25)' : 'rgba(246,201,69,0.15)'}; display: grid; place-items: center; color: var(--gm-gold-primary); font-weight: 800; font-size: ${isCustom ? '13px' : '11px'};">
                  ${isCustom ? '⭐' : 'FX'}
                </div>
                <div style="flex: 1; overflow: hidden;">
                  <h4 style="font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${eff.name}</h4>
                  <span style="font-size: 10px; color: ${isCustom ? 'var(--gm-gold-primary)' : 'var(--gm-text-muted)'}; font-weight: ${isCustom ? '700' : '400'};">${eff.category || 'Effect'}${isCustom ? ' • Custom XML' : ''}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      listContainer.querySelectorAll('[data-eff-id]').forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.dataset.effId;
          const targetLayer = this.scene?.getLayer(this.currentLayerId) || layer;
          if (targetLayer) {
            targetLayer.effects = targetLayer.effects || [];
            const effDef = this.effectPipeline.getEffect(id);
            targetLayer.effects.push({
              id,
              isCustomXml: !!effDef?.isCustomXml,
              params: {}
            });
            modal.classList.remove('active');
            this.markUnexported();
            this.renderEffectsStackList(targetLayer);
            this.render();
          }
        });
      });
    };

    // Category pills click handler
    if (catRow) {
      catRow.querySelectorAll('.gm-cat-pill').forEach((pill) => {
        pill.onclick = () => {
          catRow.querySelectorAll('.gm-cat-pill').forEach((p) => p.classList.remove('active'));
          pill.classList.add('active');
          currentCategory = pill.dataset.cat || 'all';
          renderEffects(searchInput?.value || '', currentCategory);
        };
      });
    }

    renderEffects('', currentCategory);

    if (searchInput) {
      searchInput.value = '';
      searchInput.oninput = (e) => renderEffects(e.target.value, currentCategory);
    }

    const closeBtn = document.getElementById('gmCatalogClose');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');

    const importBtn = document.getElementById('gmCatalogImportXmlBtn');
    if (importBtn) {
      importBtn.onclick = () => {
        document.getElementById('gmCustomXmlModal')?.classList.add('active');
      };
    }
  }

  // ==========================================================
  // CUSTOM XML EFFECT MODAL SYSTEM
  // ==========================================================
  setupCustomXmlModal() {
    const modal = document.getElementById('gmCustomXmlModal');
    if (!modal) return;

    const fileInput = document.getElementById('gmCustomXmlFileInput');
    const fileInfo = document.getElementById('gmXmlSelectedFileInfo');
    const codeInput = document.getElementById('gmCustomXmlCodeInput');
    const tabUpload = document.getElementById('gmTabXmlUpload');
    const tabPaste = document.getElementById('gmTabXmlPaste');
    const uploadSection = document.getElementById('gmXmlUploadSection');
    const pasteSection = document.getElementById('gmXmlPasteSection');
    const clearBtn = document.getElementById('gmClearXmlCodeBtn');
    const submitBtn = document.getElementById('gmCustomXmlSubmit');
    const cancelBtn = document.getElementById('gmCustomXmlCancel');
    const closeBtn = document.getElementById('gmCustomXmlClose');
    const applyCheck = document.getElementById('gmApplyToLayerCheck');
    const saveCheck = document.getElementById('gmSaveToLibraryCheck');
    const presetChips = document.getElementById('gmXmlPresetSampleChips');

    let currentXmlContent = '';
    let currentFileName = '';

    const openModal = () => {
      modal.classList.add('active');
    };

    const closeModal = () => {
      modal.classList.remove('active');
    };

    // Open button from layer drawer
    document.getElementById('gmAddCustomXmlEffectBtn')?.addEventListener('click', () => {
      openModal();
    });

    // Close buttons
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Tab switching
    tabUpload?.addEventListener('click', () => {
      tabUpload.classList.add('active');
      tabPaste?.classList.remove('active');
      if (uploadSection) uploadSection.style.display = 'block';
      if (pasteSection) pasteSection.style.display = 'none';
    });

    tabPaste?.addEventListener('click', () => {
      tabPaste.classList.add('active');
      tabUpload?.classList.remove('active');
      if (uploadSection) uploadSection.style.display = 'none';
      if (pasteSection) pasteSection.style.display = 'block';
      codeInput?.focus();
    });

    // Dropzone and file input handlers
    const handleFileLoaded = (file) => {
      if (!file) return;
      currentFileName = file.name;
      const reader = new FileReader();
      reader.onload = (re) => {
        currentXmlContent = re.target.result;
        if (codeInput) codeInput.value = currentXmlContent;
        if (fileInfo) {
          fileInfo.textContent = `📄 Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
          fileInfo.style.display = 'block';
        }
      };
      reader.readAsText(file);
    };

    fileInput?.addEventListener('change', (e) => {
      handleFileLoaded(e.target.files?.[0]);
    });

    const dropzone = modal.querySelector('.gm-file-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--gm-gold-primary)';
        dropzone.style.background = 'rgba(246, 201, 69, 0.08)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        dropzone.style.background = '';
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileLoaded(file);
      });
    }

    // Clear code button
    clearBtn?.addEventListener('click', () => {
      if (codeInput) codeInput.value = '';
      currentXmlContent = '';
      currentFileName = '';
      if (fileInfo) {
        fileInfo.textContent = '';
        fileInfo.style.display = 'none';
      }
      if (fileInput) fileInput.value = '';
    });

    // Sample XML preset chips
    const samplePresetUrls = {
      advsharpen: { path: './assets/advsharpen.xml', name: 'Advanced Sharpen' },
      gm_shake: { path: './assets/effects_gm3/gm_shake.xml', name: 'GM Camera Shake' },
      gm_chromatic: { path: './assets/effects_gm3/gm_v53_pack_gm_chromatic_heat_warp.xml', name: 'Chromatic Heat Warp' },
      liquid_glass: { path: './assets/effects_gm2/gm_pack_17_liquid_glass.xml', name: 'Liquid Glass Pro' }
    };

    presetChips?.querySelectorAll('[data-preset-xml]').forEach((chip) => {
      chip.addEventListener('click', async () => {
        const key = chip.dataset.presetXml;
        const info = samplePresetUrls[key];
        if (!info) return;

        const originalText = chip.textContent;
        try {
          chip.textContent = '⏳ Loading…';
          const resp = await fetch(info.path);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const xmlText = await resp.text();
          currentXmlContent = xmlText;
          currentFileName = info.name;
          if (codeInput) codeInput.value = xmlText;
          if (fileInfo) {
            fileInfo.textContent = `📄 Preset: ${info.name}`;
            fileInfo.style.display = 'block';
          }
          // Switch to paste tab so user can review the XML
          tabPaste?.click();
        } catch (err) {
          console.error('[Gold Motion] Failed to load preset XML:', err);
          alert(`Failed to load preset XML: ${err.message}`);
        } finally {
          chip.textContent = originalText;
        }
      });
    });

    // Submit handler
    submitBtn?.addEventListener('click', () => {
      const xmlToParse = (codeInput?.value || currentXmlContent || '').trim();
      if (!xmlToParse) {
        alert('Please select an XML file or paste XML effect code first.');
        return;
      }

      const shouldApply = applyCheck ? applyCheck.checked : true;
      const shouldSave = saveCheck ? saveCheck.checked : true;
      const defaultName = currentFileName ? currentFileName.replace(/\.xml$/i, '') : 'Custom XML Effect';

      try {
        const result = this.effectPipeline.parseAndRegisterXmlEffect(xmlToParse, defaultName, shouldSave);
        let layer = this.scene?.getLayer(this.currentLayerId);

        if (shouldApply) {
          if (!layer && this.scene && this.scene.layers.length > 0) {
            layer = this.scene.layers[0];
            this.selectLayer(layer.id);
          }

          if (layer) {
            layer.effects = layer.effects || [];
            if (result.type === 'definition') {
              layer.effects.push({
                id: result.effect.id,
                isCustomXml: true,
                params: {}
              });
            } else if (result.type === 'preset' && Array.isArray(result.effects)) {
              for (const eff of result.effects) {
                eff.isCustomXml = true;
                layer.effects.push(eff);
              }
            }
            this.markUnexported();
            this.renderEffectsStackList(layer);
            this.render();
          }
        }

        closeModal();

        // Refresh effects catalog if open
        const catalogModal = document.getElementById('gmEffectCatalogModal');
        if (catalogModal && catalogModal.classList.contains('active')) {
          this.openEffectCatalogModal(layer);
        }

        const effectName = result.effect?.name || (result.effects?.[0]?.id || 'Custom XML Effect');
        if (this.mascot) {
          this.mascot.say(`✨ Custom XML Effect "${effectName}" successfully loaded!`);
        } else {
          console.log(`[Gold Motion] Custom XML Effect loaded: "${effectName}"`);
        }
      } catch (err) {
        console.error('[Gold Motion] Custom XML parsing error:', err);
        alert(`Failed to parse custom XML effect:\n${err.message}`);
      }
    });
  }

  onCurveApplied(curveStr) {
    const layer = this.scene?.getLayer(this.currentLayerId);
    if (layer?.transform?.keyframes?.location) {
      for (const kf of layer.transform.keyframes.location) {
        kf.e = curveStr;
      }
    }
    this.markUnexported();
    this.updateTimelineUI();
    this.render();
  }

  onExpressionApplied(prop, code, fps) {
    const layer = this.scene?.getLayer(this.currentLayerId);
    if (layer) {
      import('./expressions/ExpressionEngine.js').then(({ ExpressionEngine }) => {
        ExpressionEngine.bakeKeyframes(layer, prop, code, fps);
        this.markUnexported();
        this.updateTimelineUI();
        this.updatePropertiesUI();
        this.render();
      });
    }
  }
}

// Boot Gold Motion when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.goldMotionApp = new GoldMotionApp();
});
