/**
 * Gold Motion Templates Page
 * Implements GmTemplatesPage with built-in motion graphics presets & XML templates
 */

export class TemplatesPage {
  constructor(container, onSelectTemplate) {
    this.container = container;
    this.onSelectTemplate = onSelectTemplate;
    this.activeCategory = 'all';

    this.templates = [
      {
        id: 'gold_opener',
        title: '24K Gold Title Opener',
        category: 'intro',
        desc: 'Cinematic 3D gold typography with ambient dust particles and lens flare.',
        aspect: '16:9',
        fps: 30,
        duration: 8000,
        thumb: '🎬'
      },
      {
        id: 'cyber_glitch',
        title: 'Cyberpunk Glitch Transition',
        category: 'vfx',
        desc: 'RGB chromatic split with matrix glyphs and velocity speed ramp.',
        aspect: '9:16',
        fps: 60,
        duration: 5000,
        thumb: '⚡'
      },
      {
        id: 'kinetic_beats',
        title: 'Kinetic Beat Typography',
        category: 'kinetic',
        desc: 'Snappy bounce text cascades synchronized with audio markers.',
        aspect: '9:16',
        fps: 30,
        duration: 10000,
        thumb: '🎵'
      },
      {
        id: 'cube_skybox_3d',
        title: '3D Cube Skybox Showcase',
        category: '3d',
        desc: 'Infinite 3D perspective quad tessellation with orbiting camera rig.',
        aspect: '16:9',
        fps: 60,
        duration: 12000,
        thumb: '🧊'
      },
      {
        id: 'vintage_film_35mm',
        title: 'Vintage 35mm Film Grain',
        category: 'vfx',
        desc: 'Authentic analog film damage, red halation, and gate weave.',
        aspect: '4:5',
        fps: 24,
        duration: 15000,
        thumb: '🎞️'
      },
      {
        id: 'logo_reveal_particles',
        title: 'Gold Logo Particle Burst',
        category: 'intro',
        desc: 'Super-resolution gold logo assembly with 3D depth point cloud.',
        aspect: '1:1',
        fps: 60,
        duration: 6000,
        thumb: '✨'
      }
    ];

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="gm-page" style="display: flex;">
        <div class="gm-projects-toolbar">
          <div class="gm-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="gmTemplateSearch" placeholder="Search templates…">
          </div>

          <div class="gm-tabs-row" id="gmTemplateTabs">
            <button class="gm-tab-btn active" data-cat="all">All</button>
            <button class="gm-tab-btn" data-cat="intro">Intros</button>
            <button class="gm-tab-btn" data-cat="vfx">VFX</button>
            <button class="gm-tab-btn" data-cat="kinetic">Kinetic</button>
            <button class="gm-tab-btn" data-cat="3d">3D Labs</button>
          </div>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 20px;">
          <div class="gm-projects-grid" id="gmTemplatesGrid"></div>
        </div>
      </div>
    `;

    this.setupEvents();
    this.renderCards();
  }

  setupEvents() {
    this.container.querySelectorAll('#gmTemplateTabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('#gmTemplateTabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.dataset.cat;
        this.renderCards();
      });
    });

    const search = this.container.querySelector('#gmTemplateSearch');
    search?.addEventListener('input', () => this.renderCards());
  }

  renderCards() {
    const grid = this.container.querySelector('#gmTemplatesGrid');
    const searchVal = this.container.querySelector('#gmTemplateSearch')?.value.toLowerCase() || '';

    const list = this.templates.filter(t => {
      const matchCat = this.activeCategory === 'all' || t.category === this.activeCategory;
      const matchSearch = !searchVal || t.title.toLowerCase().includes(searchVal) || t.desc.toLowerCase().includes(searchVal);
      return matchCat && matchSearch;
    });

    grid.innerHTML = list.map(t => `
      <div class="gm-project-card" data-tid="${t.id}">
        <div class="gm-project-thumb-wrap">
          <div style="font-size: 36px;">${t.thumb}</div>
          <span class="gm-project-aspect-tag">${t.aspect}</span>
        </div>
        <div class="gm-project-info">
          <div class="gm-project-name">${t.title}</div>
          <p style="font-size: 11px; color: var(--gm-text-muted); line-height: 1.4; margin: 4px 0 8px;">${t.desc}</p>
          <div class="gm-project-meta">
            <span>${t.duration / 1000}s • ${t.fps}fps</span>
            <button class="gm-btn gm-btn-gold" style="padding: 4px 10px; font-size: 11px;">Use Template</button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.gm-project-card').forEach(card => {
      card.addEventListener('click', () => {
        const tid = card.dataset.tid;
        const template = this.templates.find(x => x.id === tid);
        if (template && this.onSelectTemplate) {
          this.onSelectTemplate(template);
        }
      });
    });
  }
}
