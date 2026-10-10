/**
 * Gold Motion Projects Page
 * Implements GmProjectsPage matching Android gm_projects_page.xml
 */

import { XmlHandler } from '../xml/XmlHandler.js';

export class ProjectsPage {
  constructor(container, storageManager, onOpenProject, onNewProject) {
    this.container = container;
    this.storage = storageManager;
    this.onOpenProject = onOpenProject;
    this.onNewProject = onNewProject;

    this.projects = [];
    this.activeTab = 0; // 0: Projects, 1: Elements, 2: Templates
    this.searchQuery = '';
    this.sortBy = 'date'; // 'date', 'name', 'size'
    this.viewMode = 'grid'; // 'grid', 'list'
    this.selectedIds = new Set();
    this.isSelectionMode = false;

    this.init();
  }

  async init() {
    this.render();
    await this.refresh();
  }

  async refresh() {
    this.projects = await this.storage.getAllProjects();
    this.renderList();
  }

  render() {
    this.container.innerHTML = `
      <div class="gm-page" id="gmProjectsPageRoot" style="display: flex;">
        <!-- Selection Bar -->
        <div class="gm-selection-bar" id="gmSelBar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="gm-btn gm-btn-icon" id="gmSelClose" style="background: rgba(0,0,0,0.15); border: none; color: #1a1202;">✕</button>
            <span id="gmSelCount">0 selected</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="gm-btn" id="gmSelAll" style="background: rgba(0,0,0,0.15); border: none; color: #1a1202;">Select All</button>
            <button class="gm-btn" id="gmSelDuplicate" style="background: rgba(0,0,0,0.15); border: none; color: #1a1202;">Duplicate</button>
            <button class="gm-btn" id="gmSelExport" style="background: rgba(0,0,0,0.15); border: none; color: #1a1202;">Export XML</button>
            <button class="gm-btn" id="gmSelDelete" style="background: rgba(239, 68, 68, 0.9); border: none; color: #fff;">Delete</button>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="gm-projects-toolbar">
          <div class="gm-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="gmSearchInput" placeholder="Search projects…">
          </div>

          <div class="gm-tabs-row">
            <button class="gm-tab-btn active" data-tab="0">Projects</button>
            <button class="gm-tab-btn" data-tab="1">Elements</button>
            <button class="gm-tab-btn" data-tab="2">Templates</button>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="gm-btn" id="gmSortBtn" title="Sort Projects">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span id="gmSortLabel">Date</span>
            </button>
            <button class="gm-btn gm-btn-gold" id="gmNewProjTopBtn">+ New</button>
          </div>
        </div>

        <!-- Content Area -->
        <div style="flex: 1; overflow-y: auto;">
          <div class="gm-projects-grid" id="gmProjectsGrid"></div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  setupEvents() {
    const searchInput = this.container.querySelector('#gmSearchInput');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderList();
    });

    // Tab buttons
    this.container.querySelectorAll('.gm-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.gm-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = parseInt(btn.dataset.tab);
        this.renderList();
      });
    });

    // Sort toggle
    const sortBtn = this.container.querySelector('#gmSortBtn');
    const sortLabel = this.container.querySelector('#gmSortLabel');
    sortBtn?.addEventListener('click', () => {
      if (this.sortBy === 'date') this.sortBy = 'name';
      else if (this.sortBy === 'name') this.sortBy = 'size';
      else this.sortBy = 'date';
      if (sortLabel) sortLabel.textContent = this.sortBy.charAt(0).toUpperCase() + this.sortBy.slice(1);
      this.renderList();
    });

    // New project button
    this.container.querySelector('#gmNewProjTopBtn')?.addEventListener('click', () => {
      if (this.onNewProject) this.onNewProject();
    });

    // Selection bar buttons
    const selBar = this.container.querySelector('#gmSelBar');
    const selClose = this.container.querySelector('#gmSelClose');
    const selAll = this.container.querySelector('#gmSelAll');
    const selDuplicate = this.container.querySelector('#gmSelDuplicate');
    const selExport = this.container.querySelector('#gmSelExport');
    const selDelete = this.container.querySelector('#gmSelDelete');

    selClose?.addEventListener('click', () => {
      this.selectedIds.clear();
      this.isSelectionMode = false;
      selBar?.classList.remove('active');
      this.renderList();
    });

    selAll?.addEventListener('click', () => {
      this.projects.forEach(p => this.selectedIds.add(p.id));
      this.updateSelectionUI();
    });

    selDuplicate?.addEventListener('click', async () => {
      for (const id of this.selectedIds) {
        const p = this.projects.find(x => x.id === id);
        if (p) {
          const cloned = JSON.parse(JSON.stringify(p));
          cloned.id = String(Date.now() + Math.random());
          cloned.title = `${p.title} Copy`;
          await this.storage.saveProject(cloned);
        }
      }
      this.selectedIds.clear();
      this.isSelectionMode = false;
      selBar?.classList.remove('active');
      await this.refresh();
    });

    selExport?.addEventListener('click', () => {
      for (const id of this.selectedIds) {
        const p = this.projects.find(x => x.id === id);
        if (p) {
          const xml = XmlHandler.serialize(p);
          const blob = new Blob([xml], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${p.title.replace(/\s+/g, '_')}.xml`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    });

    selDelete?.addEventListener('click', async () => {
      if (confirm(`Delete ${this.selectedIds.size} selected projects?`)) {
        for (const id of this.selectedIds) {
          await this.storage.deleteProject(id);
        }
        this.selectedIds.clear();
        this.isSelectionMode = false;
        selBar?.classList.remove('active');
        await this.refresh();
      }
    });
  }

  updateSelectionUI() {
    const selBar = this.container.querySelector('#gmSelBar');
    const countEl = this.container.querySelector('#gmSelCount');
    if (countEl) countEl.textContent = `${this.selectedIds.size} selected`;
    if (this.selectedIds.size > 0) {
      selBar?.classList.add('active');
      this.isSelectionMode = true;
    } else {
      selBar?.classList.remove('active');
      this.isSelectionMode = false;
    }
    this.renderList();
  }

  renderList() {
    const grid = this.container.querySelector('#gmProjectsGrid');
    if (!grid) return;

    let filtered = [...this.projects];
    if (this.searchQuery) {
      filtered = filtered.filter(p => p.title.toLowerCase().includes(this.searchQuery));
    }

    if (this.sortBy === 'name') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--gm-text-muted);">
          <div style="font-size: 40px; margin-bottom: 12px;">📁</div>
          <h3 style="font-size: 16px; color: #fff; margin-bottom: 6px;">No Projects Found</h3>
          <p style="font-size: 13px;">Tap <strong>+ New</strong> or import an XML to start creating.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isSelected = this.selectedIds.has(p.id);
      const aspect = p.width && p.height ? `${p.width}:${p.height}` : '16:9';
      const dateStr = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : 'Recent';
      const durationSec = (p.totalTime || 10000) / 1000;

      return `
        <div class="gm-project-card ${isSelected ? 'selected' : ''}" data-id="${p.id}" style="${isSelected ? 'border-color: var(--gm-gold-primary); box-shadow: 0 0 12px var(--gm-gold-glow);' : ''}">
          <div class="gm-project-thumb-wrap">
            <div style="font-size: 28px;">🎬</div>
            <span class="gm-project-aspect-tag">${aspect}</span>
          </div>
          <div class="gm-project-info">
            <div class="gm-project-name" title="${p.title}">${p.title}</div>
            <div class="gm-project-meta">
              <span>${durationSec}s • ${p.fps || 30}fps</span>
              <span>${dateStr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card clicks
    grid.querySelectorAll('.gm-project-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', (e) => {
        if (this.isSelectionMode || e.shiftKey) {
          if (this.selectedIds.has(id)) this.selectedIds.delete(id);
          else this.selectedIds.add(id);
          this.updateSelectionUI();
        } else {
          if (this.onOpenProject) this.onOpenProject(id);
        }
      });

      // Long press / right click for selection
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.selectedIds.add(id);
        this.updateSelectionUI();
      });
    });
  }
}
