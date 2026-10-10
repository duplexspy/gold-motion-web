/**
 * Gold Motion Web Application Entry Point
 * Integrates all modules, engines, UI panels, and APK assets
 */

import { Scene } from './engine/Scene.js';
import { Timeline } from './engine/Timeline.js';
import { Renderer } from './engine/Renderer.js';
import { ShapeEngine } from './engine/ShapeEngine.js';
import { EffectPipeline } from './engine/EffectPipeline.js';
import { XmlHandler } from './xml/XmlHandler.js';
import { StorageManager } from './storage/StorageManager.js';

import { NavBar } from './ui/NavBar.js';
import { ProjectsPage } from './ui/ProjectsPage.js';
import { TemplatesPage } from './ui/TemplatesPage.js';
import { GraphEditor } from './ui/GraphEditor.js';
import { ExportDialog } from './ui/ExportDialog.js';
import { CreateProjectModal } from './ui/CreateProjectModal.js';
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
    this.currentProperty = 'rotation';

    this.canvas = document.getElementById('gmMainCanvas');
    this.init();
  }

  async init() {
    console.log('[Gold Motion Web] Booting application…');

    // 1. Initialize engines
    await Promise.all([
      this.shapeEngine.init(),
      this.effectPipeline.init(),
      this.storage.initDB()
    ]);

    // 2. Initialize timeline & renderer
    this.renderer = new Renderer(this.canvas, this.effectPipeline, this.shapeEngine);
    this.timeline = new Timeline({
      fps: 30,
      totalTime: 10000,
      onTimeUpdate: (ms) => this.onTimeUpdate(ms),
      onStateChange: (isPlaying) => this.onPlayStateChange(isPlaying)
    });

    // 3. Initialize UI dialogs & mascot
    this.initDialogs();

    // 4. Load or restore active project
    await this.loadInitialProject();

    // 5. Initialize Navigation & pages
    this.initNav();

    // 6. Bind Editor Controls
    this.bindEditorControls();

    // Initial render
    this.render();

    console.log('[Gold Motion Web] Successfully started.');
  }

  initDialogs() {
    // Navigation bar
    this.navBar = new NavBar(
      document.getElementById('gmNavMount'),
      (tab) => this.switchPage(tab),
      () => this.createModal.open()
    );

    // Create Project modal
    this.createModal = new CreateProjectModal(
      document.getElementById('gmCreateModalMount'),
      (newScene) => this.loadScene(newScene)
    );

    // Graph editor
    this.graphEditor = new GraphEditor(
      document.getElementById('gmGraphModalMount'),
      (curveStr) => this.onCurveApplied(curveStr)
    );

    // Expression editor
    this.expressionDialog = new ExpressionDialog(
      document.getElementById('gmExprModalMount'),
      (prop, code, fps) => this.onExpressionApplied(prop, code, fps)
    );

    // Export dialog
    this.exportDialog = new ExportDialog(
      document.getElementById('gmExportModalMount'),
      () => this.scene,
      () => this.renderer
    );

    // 3D Labs Studio page
    this.threeDLabs = new ThreeDLabs(
      document.getElementById('gmLabsPageRoot'),
      (layerData) => {
        if (this.scene) {
          const l = this.scene.createLayer('shape', layerData);
          this.scene.addLayer(l);
          this.switchPage('editor');
          this.selectLayer(l.id);
          this.render();
        }
      }
    );

    // Extra Tools Studio page
    this.toolStudio = new ToolStudio(
      document.getElementById('gmToolsPageRoot'),
      (media) => {}
    );

    // Interactive Mascot & Gold AI
    this.mascot = new GoldMascot(
      document.getElementById('gmMascotMount')
    );

    // Projects Manager page
    this.projectsPage = new ProjectsPage(
      document.getElementById('gmProjectsPageMount'),
      this.storage,
      (projId) => this.openProjectFromId(projId),
      () => this.createModal.open()
    );

    // Templates page
    this.templatesPage = new TemplatesPage(
      document.getElementById('gmTemplatesPageMount'),
      (template) => this.openTemplateProject(template)
    );
  }

  async loadInitialProject() {
    try {
      const saved = await this.storage.getAllProjects();
      if (saved && saved.length > 0) {
        this.loadScene(new Scene(saved[0]));
        return;
      }

      // Load sample beta_anim.xml from APK
      let res = await fetch('./assets/hometab/beta_anim.xml');
      if (!res.ok) {
        res = await fetch('/api/sample-project');
      }
      if (res && res.ok) {
        const xml = await res.text();
        const parsed = XmlHandler.parse(xml);
        parsed.title = 'Gold Motion Intro';
        await this.storage.saveProject(parsed);
        this.loadScene(parsed);
      } else {
        this.loadDefaultScene();
      }
    } catch (e) {
      console.warn('[Gold Motion] Could not load sample project, creating default:', e);
      this.loadDefaultScene();
    }
  }

  loadDefaultScene() {
    const scene = new Scene({
      title: 'Gold Motion Project',
      width: 1920,
      height: 1080,
      bgcolor: '#0c0d12',
      totalTime: 10000,
      fps: 30
    });

    // 1. Gold Title Text
    scene.addLayer(scene.createLayer('text', {
      label: 'Gold Motion Title',
      tag: 'gold',
      content: 'GOLD MOTION',
      fontSize: 84,
      font: 'Audiowide',
      fillColor: '#f6c945',
      location: [960, 480],
      scale: [1, 1],
      rotation: 0
    }));

    // 2. Subtitle Text
    scene.addLayer(scene.createLayer('text', {
      label: 'Subtitle',
      tag: 'purple',
      content: 'MOTION GRAPHICS & VFX',
      fontSize: 32,
      font: 'Roboto',
      fillColor: '#ffffff',
      location: [960, 600]
    }));

    this.loadScene(scene);
  }

  loadScene(scene) {
    this.scene = scene;
    this.timeline.totalTime = scene.totalTime;
    this.timeline.fps = scene.fps;
    this.timeline.currentTime = 0;

    if (scene.layers.length > 0) {
      this.selectLayer(scene.layers[0].id);
    } else {
      this.selectLayer(null);
    }

    const titleEl = document.getElementById('gmEditorProjectName');
    if (titleEl) titleEl.textContent = scene.title || 'Gold Motion Studio';

    this.updateTimelineUI();
    this.render();
  }

  switchPage(tab) {
    // Hide all pages
    document.querySelectorAll('.gm-page').forEach(p => p.classList.remove('active'));

    const editorView = document.getElementById('gmEditorView');
    const homeView = document.getElementById('gmHomePage');
    const projectsView = document.getElementById('gmProjectsPageMount').firstElementChild;
    const labsView = document.getElementById('gmLabsPageRoot').firstElementChild;
    const templatesView = document.getElementById('gmTemplatesPageMount').firstElementChild;
    const toolsView = document.getElementById('gmToolsPageRoot').firstElementChild;

    if (tab === 'home') {
      homeView?.classList.add('active');
    } else if (tab === 'projects') {
      projectsView?.classList.add('active');
      this.projectsPage.refresh();
    } else if (tab === 'labs') {
      labsView?.classList.add('active');
    } else if (tab === 'templates') {
      templatesView?.classList.add('active');
    } else if (tab === 'tools') {
      toolsView?.classList.add('active');
    } else if (tab === 'editor') {
      editorView?.classList.add('active');
    }

    this.navBar.setActive(tab);
  }

  async openProjectFromId(id) {
    const proj = await this.storage.getProject(id);
    if (proj) {
      this.loadScene(new Scene(proj));
      this.switchPage('editor');
    }
  }

  openTemplateProject(template) {
    const scene = new Scene({
      title: template.title,
      width: template.aspect === '9:16' ? 1080 : 1920,
      height: template.aspect === '9:16' ? 1920 : 1080,
      bgcolor: '#090a0f',
      totalTime: template.duration || 8000,
      fps: template.fps || 30
    });

    scene.addLayer(scene.createLayer('text', {
      label: template.title,
      tag: 'gold',
      content: template.title.toUpperCase(),
      fontSize: 72,
      font: 'Audiowide',
      fillColor: '#f6c945',
      location: [scene.width / 2, scene.height / 2]
    }));

    this.loadScene(scene);
    this.switchPage('editor');
  }

  onTimeUpdate(ms) {
    // Update timecode display
    const tcEl = document.getElementById('gmTimecode');
    if (tcEl) tcEl.textContent = this.timeline.formatTimecode(ms);

    // Update playhead position in tracks ruler
    const tracksContainer = document.getElementById('gmTracksContainer');
    const playhead = document.getElementById('gmPlayheadLine');
    if (tracksContainer && playhead) {
      const totalW = tracksContainer.clientWidth || 1000;
      const x = (ms / this.timeline.totalTime) * totalW;
      playhead.style.transform = `translateX(${x}px)`;
    }

    this.render();
  }

  onPlayStateChange(isPlaying) {
    const playBtn = document.getElementById('gmPlayBtn');
    if (playBtn) {
      playBtn.innerHTML = isPlaying
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }
  }

  render() {
    if (!this.scene || !this.renderer) return;
    this.renderer.selectedLayerId = this.currentLayerId;
    this.renderer.render(this.scene, this.timeline.currentTime);
  }

  selectLayer(layerId) {
    this.currentLayerId = layerId;
    this.updateTimelineUI();
    this.updatePropertiesUI();
    this.render();
  }

  updateTimelineUI() {
    const headersList = document.getElementById('gmTrackHeadersList');
    const lanesList = document.getElementById('gmLanesList');
    if (!headersList || !lanesList || !this.scene) return;

    // Render Headers
    headersList.innerHTML = this.scene.layers.map(l => {
      const isSelected = l.id === this.currentLayerId;
      return `
        <div class="gm-track-header-row ${isSelected ? 'active' : ''}" data-lid="${l.id}">
          <div class="gm-track-tag" style="background: var(--gm-accent-${l.tag || 'gold'});"></div>
          <svg class="gm-track-eye ${l.visible ? 'on' : ''}" data-action="toggle-vis" data-lid="${l.id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${l.visible 
              ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
              : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
            }
          </svg>
          <span class="gm-track-name">${l.label}</span>
        </div>
      `;
    }).join('');

    // Render Track Lanes
    lanesList.innerHTML = this.scene.layers.map(l => {
      const isSelected = l.id === this.currentLayerId;
      const leftPct = (l.startTime / this.scene.totalTime) * 100;
      const widthPct = Math.max(2, ((l.endTime - l.startTime) / this.scene.totalTime) * 100);

      // Render keyframes inside clip bar
      let kfDiamonds = '';
      if (l.transform.keyframes) {
        for (const [prop, kfList] of Object.entries(l.transform.keyframes)) {
          if (!Array.isArray(kfList)) continue;
          for (const kf of kfList) {
            const kfLeft = kf.t * 100;
            kfDiamonds += `<div class="gm-kf-diamond" style="left: ${kfLeft}%;" title="${prop} at ${(kf.t * 100).toFixed(0)}%"></div>`;
          }
        }
      }

      return `
        <div class="gm-track-lane" data-lid="${l.id}">
          <div class="gm-clip-bar ${isSelected ? 'active' : ''}" style="left: ${leftPct}%; width: ${widthPct}%;">
            <span>${l.label}</span>
            ${kfDiamonds}
          </div>
        </div>
      `;
    }).join('');

    // Attach row events
    headersList.querySelectorAll('.gm-track-header-row').forEach(row => {
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

    lanesList.querySelectorAll('.gm-track-lane').forEach(lane => {
      lane.addEventListener('click', () => {
        this.selectLayer(lane.dataset.lid);
      });
    });
  }

  updatePropertiesUI() {
    const propPanel = document.getElementById('gmPropertiesPanel');
    if (!propPanel || !this.scene) return;

    const layer = this.scene.getLayer(this.currentLayerId);
    if (!layer) {
      propPanel.innerHTML = `
        <div class="gm-prop-header">
          <span>Project Properties</span>
        </div>
        <div class="gm-prop-section">
          <div class="gm-prop-row">
            <span class="gm-prop-label">Title</span>
            <input type="text" class="gm-prop-input" id="gmPropTitle" value="${this.scene.title}" style="width: 140px; text-align: left;">
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Resolution</span>
            <span style="font-weight: 700;">${this.scene.width} x ${this.scene.height}</span>
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Duration</span>
            <span style="font-weight: 700;">${this.scene.totalTime / 1000}s</span>
          </div>
        </div>
      `;
      return;
    }

    // Render Layer Properties
    const loc = layer.transform.location || [this.scene.width / 2, this.scene.height / 2];
    const scale = layer.transform.scale || [1, 1];
    const rot = layer.transform.rotation || 0;
    const rotX = layer.transform.rotationX || 0;
    const rotY = layer.transform.rotationY || 0;
    const op = layer.transform.opacity !== undefined ? layer.transform.opacity : 1;

    propPanel.innerHTML = `
      <div class="gm-prop-header">
        <span>${layer.label}</span>
        <button class="gm-btn gm-btn-icon" id="gmDeleteLayerBtn" title="Delete Layer" style="color: var(--gm-accent-red);">✕</button>
      </div>

      <!-- Transform Controls -->
      <div class="gm-prop-section">
        <div class="gm-prop-title">
          <span>Transform & Movement</span>
          <div style="display: flex; gap: 4px;">
            <button class="gm-btn" id="gmOpenGraphBtn" title="Open Bezier Graph Editor" style="padding: 3px 8px; font-size: 11px;">📈 Ease</button>
            <button class="gm-btn" id="gmOpenExprBtn" title="Expression Editor" style="padding: 3px 8px; font-size: 11px;">⚡ Expr</button>
          </div>
        </div>

        <div class="gm-prop-row">
          <span class="gm-prop-label">Position X / Y</span>
          <div class="gm-prop-input-wrap">
            <input type="number" class="gm-prop-input" id="gmPropPosX" value="${Math.round(loc[0])}">
            <input type="number" class="gm-prop-input" id="gmPropPosY" value="${Math.round(loc[1])}">
            <div class="gm-kf-toggle ${layer.transform.keyframes?.location ? 'active' : ''}" data-prop="location" title="Add / Remove Keyframe">◆</div>
          </div>
        </div>

        <div class="gm-prop-row">
          <span class="gm-prop-label">Scale X / Y</span>
          <div class="gm-prop-input-wrap">
            <input type="number" step="0.1" class="gm-prop-input" id="gmPropScaleX" value="${scale[0]}">
            <input type="number" step="0.1" class="gm-prop-input" id="gmPropScaleY" value="${scale[1]}">
            <div class="gm-kf-toggle ${layer.transform.keyframes?.scale ? 'active' : ''}" data-prop="scale" title="Add / Remove Keyframe">◆</div>
          </div>
        </div>

        <div class="gm-prop-row">
          <span class="gm-prop-label">2D Rotation (Angle)</span>
          <div class="gm-prop-input-wrap">
            <input type="number" class="gm-prop-input" id="gmPropRot" value="${rot}">
            <div class="gm-kf-toggle ${layer.transform.keyframes?.rotation ? 'active' : ''}" data-prop="rotation" title="Add / Remove Keyframe">◆</div>
          </div>
        </div>

        <div class="gm-prop-row">
          <span class="gm-prop-label">3D Rotation X (Pitch)</span>
          <div class="gm-prop-input-wrap">
            <input type="number" class="gm-prop-input" id="gmPropRotX" value="${rotX}">
            <div class="gm-kf-toggle ${layer.transform.keyframes?.rotationX ? 'active' : ''}" data-prop="rotationX" title="Add / Remove Keyframe">◆</div>
          </div>
        </div>

        <div class="gm-prop-row">
          <span class="gm-prop-label">3D Rotation Y (Yaw)</span>
          <div class="gm-prop-input-wrap">
            <input type="number" class="gm-prop-input" id="gmPropRotY" value="${rotY}">
            <div class="gm-kf-toggle ${layer.transform.keyframes?.rotationY ? 'active' : ''}" data-prop="rotationY" title="Add / Remove Keyframe">◆</div>
          </div>
        </div>

        <div class="gm-prop-row">
          <span class="gm-prop-label">Opacity</span>
          <div class="gm-prop-input-wrap">
            <input type="range" min="0" max="1" step="0.05" class="gm-slider" id="gmPropOpacity" value="${op}" style="width: 80px;">
            <div class="gm-kf-toggle ${layer.transform.keyframes?.opacity ? 'active' : ''}" data-prop="opacity" title="Add / Remove Keyframe">◆</div>
          </div>
        </div>
      </div>

      <!-- Content Properties -->
      <div class="gm-prop-section">
        <div class="gm-prop-title">Content & Styling</div>
        ${layer.type === 'text' ? `
          <div class="gm-prop-row">
            <span class="gm-prop-label">Text</span>
            <input type="text" class="gm-prop-input" id="gmPropTextContent" value="${layer.content || ''}" style="width: 140px; text-align: left;">
          </div>
          <div class="gm-prop-row">
            <span class="gm-prop-label">Font Size</span>
            <input type="number" class="gm-prop-input" id="gmPropTextSize" value="${layer.fontSize || 48}">
          </div>
        ` : ''}

        <div class="gm-prop-row">
          <span class="gm-prop-label">Fill Color</span>
          <input type="color" id="gmPropColor" value="${layer.fillColor?.slice(0, 7) || '#f6c945'}" style="background: none; border: none; cursor: pointer; width: 36px; height: 32px;">
        </div>
      </div>

      <!-- Effects Stack -->
      <div class="gm-prop-section">
        <div class="gm-prop-title">
          <span>Effects Stack (${layer.effects?.length || 0})</span>
          <button class="gm-btn gm-btn-gold" id="gmAddEffectBtn" style="padding: 3px 8px; font-size: 11px;">+ Add Effect</button>
        </div>
        <div id="gmEffectsList">
          ${(layer.effects || []).map((eff, idx) => `
            <div style="background: var(--gm-bg-card); border: 1px solid var(--gm-border-subtle); border-radius: 8px; padding: 10px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 700; font-size: 12px; color: var(--gm-gold-primary);">${eff.id.replace('com.alightcreative.effects.', '')}</span>
                <button class="gm-btn gm-btn-icon" data-del-eff="${idx}" style="width: 22px; height: 22px; padding: 0;">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Attach Property Listeners
    this.bindPropertyInputs(layer);
  }

  bindPropertyInputs(layer) {
    const posX = document.getElementById('gmPropPosX');
    const posY = document.getElementById('gmPropPosY');
    const scaleX = document.getElementById('gmPropScaleX');
    const scaleY = document.getElementById('gmPropScaleY');
    const rot = document.getElementById('gmPropRot');
    const rotX = document.getElementById('gmPropRotX');
    const rotY = document.getElementById('gmPropRotY');
    const op = document.getElementById('gmPropOpacity');
    const color = document.getElementById('gmPropColor');
    const textContent = document.getElementById('gmPropTextContent');
    const textSize = document.getElementById('gmPropTextSize');

    const update = () => {
      if (posX && posY) layer.transform.location = [parseFloat(posX.value) || 0, parseFloat(posY.value) || 0];
      if (scaleX && scaleY) layer.transform.scale = [parseFloat(scaleX.value) || 1, parseFloat(scaleY.value) || 1];
      if (rot) layer.transform.rotation = parseFloat(rot.value) || 0;
      if (rotX) layer.transform.rotationX = parseFloat(rotX.value) || 0;
      if (rotY) layer.transform.rotationY = parseFloat(rotY.value) || 0;
      if (op) layer.transform.opacity = parseFloat(op.value);
      if (color) layer.fillColor = color.value;
      if (textContent) layer.content = textContent.value;
      if (textSize) layer.fontSize = parseFloat(textSize.value) || 48;

      this.storage.setUnsaved(true);
      this.render();
    };

    [posX, posY, scaleX, scaleY, rot, rotX, rotY, op, color, textContent, textSize].forEach(el => {
      el?.addEventListener('input', update);
    });

    // Delete Layer button
    document.getElementById('gmDeleteLayerBtn')?.addEventListener('click', () => {
      if (confirm(`Delete ${layer.label}?`)) {
        this.scene.removeLayer(layer.id);
        this.selectLayer(this.scene.layers[0]?.id || null);
      }
    });

    // Keyframe Toggles
    document.querySelectorAll('.gm-kf-toggle').forEach(t => {
      t.addEventListener('click', () => {
        const prop = t.dataset.prop;
        const currVal = layer.transform[prop];
        this.scene.addKeyframe(layer.id, prop, this.timeline.currentTime, currVal);
        this.updateTimelineUI();
        this.updatePropertiesUI();
        this.render();
      });
    });

    // Graph editor button
    document.getElementById('gmOpenGraphBtn')?.addEventListener('click', () => {
      this.graphEditor.open();
    });

    // Expression button
    document.getElementById('gmOpenExprBtn')?.addEventListener('click', () => {
      this.expressionDialog.open(layer);
    });

    // Add effect button
    document.getElementById('gmAddEffectBtn')?.addEventListener('click', () => {
      this.openEffectCatalogModal(layer);
    });
  }

  openEffectCatalogModal(layer) {
    const modal = document.getElementById('gmEffectCatalogModal');
    if (!modal) return;
    modal.classList.add('active');

    const listContainer = document.getElementById('gmCatalogList');
    const searchInput = document.getElementById('gmCatalogSearch');

    const renderEffects = (query = '') => {
      const list = this.effectPipeline.searchEffects(query).slice(0, 60);
      listContainer.innerHTML = list.map(eff => `
        <div class="gm-tool-card" data-eff-id="${eff.id}" style="padding: 12px; cursor: pointer;">
          <div style="display: flex; gap: 10px; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(246,201,69,0.15); display: grid; place-items: center; color: var(--gm-gold-primary); font-weight: 800; font-size: 13px;">
              FX
            </div>
            <div style="flex: 1; overflow: hidden;">
              <h4 style="font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${eff.name}</h4>
              <span style="font-size: 10.5px; color: var(--gm-text-muted);">${eff.category}</span>
            </div>
          </div>
        </div>
      `).join('');

      listContainer.querySelectorAll('[data-eff-id]').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.eff_id;
          layer.effects.push({ id, params: {} });
          modal.classList.remove('active');
          this.updatePropertiesUI();
          this.render();
        });
      });
    };

    renderEffects('');
    searchInput?.addEventListener('input', (e) => renderEffects(e.target.value));

    document.getElementById('gmCatalogClose')?.addEventListener('click', () => modal.classList.remove('active'));
  }

  onCurveApplied(curveStr) {
    if (!this.currentLayerId || !this.scene) return;
    const layer = this.scene.getLayer(this.currentLayerId);
    if (layer && layer.transform.keyframes?.rotation) {
      for (const kf of layer.transform.keyframes.rotation) {
        kf.e = curveStr;
      }
    }
    this.updateTimelineUI();
    this.render();
  }

  onExpressionApplied(prop, code, fps) {
    if (!this.currentLayerId || !this.scene) return;
    const layer = this.scene.getLayer(this.currentLayerId);
    if (layer) {
      import('./expressions/ExpressionEngine.js').then(({ ExpressionEngine }) => {
        ExpressionEngine.bakeKeyframes(layer, prop, code, fps);
        this.updateTimelineUI();
        this.updatePropertiesUI();
        this.render();
      });
    }
  }

  bindEditorControls() {
    // Play button
    document.getElementById('gmPlayBtn')?.addEventListener('click', () => {
      this.timeline.toggle();
    });

    // Transport buttons
    document.getElementById('gmPrevKfBtn')?.addEventListener('click', () => {
      this.timeline.seekFrame(-1);
    });
    document.getElementById('gmNextKfBtn')?.addEventListener('click', () => {
      this.timeline.seekFrame(1);
    });

    // Timeline Scrubbing
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
      window.addEventListener('pointerup', () => isScrubbing = false);
    }

    // Header Nav & Brand
    document.getElementById('gmHeaderBrand')?.addEventListener('click', () => this.switchPage('home'));
    document.getElementById('gmHeaderNavHome')?.addEventListener('click', () => this.switchPage('home'));
    document.getElementById('gmHeaderNavEditor')?.addEventListener('click', () => this.switchPage('editor'));
    document.getElementById('gmHeaderNavTools')?.addEventListener('click', () => this.switchPage('tools'));

    // Home Quick Action Cards
    document.getElementById('gmHomeNewProject')?.addEventListener('click', () => this.createModal.open());
    document.getElementById('gmHomeOpenEditor')?.addEventListener('click', () => this.switchPage('editor'));
    document.getElementById('gmHomeOpenLabs')?.addEventListener('click', () => this.switchPage('labs'));
    document.getElementById('gmHomeOpenTools')?.addEventListener('click', () => this.switchPage('tools'));
    document.getElementById('gmHomeOpenTemplates')?.addEventListener('click', () => this.switchPage('templates'));
    document.getElementById('gmBackupNowBtn')?.addEventListener('click', () => this.storage.downloadFullBackup());
    document.getElementById('gmViewAllFxLink')?.addEventListener('click', () => {
      if (this.scene && this.scene.layers.length > 0) {
        this.openEffectCatalogModal(this.scene.layers[0]);
      } else {
        this.switchPage('tools');
      }
    });

    // Editor Topbar Buttons
    document.getElementById('gmEditorBackBtn')?.addEventListener('click', () => this.switchPage('home'));
    document.getElementById('gmTogglePropsBtn')?.addEventListener('click', () => {
      document.getElementById('gmPropertiesPanel')?.classList.toggle('open');
    });

    // Top Header Buttons
    document.getElementById('gmExportHeaderBtn')?.addEventListener('click', () => {
      this.exportDialog.open();
    });

    document.getElementById('gmSaveBackupBtn')?.addEventListener('click', () => {
      this.storage.downloadFullBackup();
    });

    document.getElementById('gmXmlImportInput')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        const scene = XmlHandler.parse(text);
        await this.storage.saveProject(scene);
        this.loadScene(scene);
        this.switchPage('editor');
      }
    });

    // Add Layer Button
    document.getElementById('gmAddLayerBtn')?.addEventListener('click', () => {
      const type = prompt('Add Layer Type: "shape", "text", "media"', 'shape');
      if (type && this.scene) {
        const l = this.scene.createLayer(type.toLowerCase());
        this.scene.addLayer(l);
        this.selectLayer(l.id);
      }
    });
  }
}

// Boot Gold Motion when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.goldMotionApp = new GoldMotionApp();
});
