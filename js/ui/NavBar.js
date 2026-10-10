/**
 * Gold Motion Bottom Navigation Bar
 * Implements GmNavBar matching Android gm_nav_bar.xml
 */

export class NavBar {
  constructor(container, onNavigate, onPlusClick) {
    this.container = container;
    this.onNavigate = onNavigate;
    this.onPlusClick = onPlusClick;
    this.activeTab = 'home';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <nav class="gm-nav-bar">
        <!-- Tab 0: Home -->
        <div class="gm-nav-item ${this.activeTab === 'home' ? 'active' : ''}" data-tab="home" title="Home">
          <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Home</span>
        </div>

        <!-- Tab 1: Projects -->
        <div class="gm-nav-item ${this.activeTab === 'projects' ? 'active' : ''}" data-tab="projects" title="Projects">
          <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          <span>Projects</span>
        </div>

        <!-- Center: Plus Create Project -->
        <div class="gm-nav-plus" id="gmNavPlusBtn" title="Create New Project">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>

        <!-- Tab 3: 3D Labs -->
        <div class="gm-nav-item ${this.activeTab === 'labs' ? 'active' : ''}" data-tab="labs" title="3D Labs">
          <svg viewBox="0 0 24 24">
            <path d="M12 3 L20 7.5 L12 12 L4 7.5 Z" />
            <path d="M4 7.5 L12 12 L12 21 L4 16.5 Z" />
            <path d="M20 7.5 L12 12 L12 21 L20 16.5 Z" />
          </svg>
          <span>3D Labs</span>
        </div>

        <!-- Tab 4: Templates -->
        <div class="gm-nav-item ${this.activeTab === 'templates' ? 'active' : ''}" data-tab="templates" title="Templates">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <span>Templates</span>
        </div>
      </nav>
    `;

    this.container.querySelectorAll('.gm-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.setActive(tab);
        if (this.onNavigate) this.onNavigate(tab);
      });
    });

    this.container.querySelector('#gmNavPlusBtn')?.addEventListener('click', () => {
      if (this.onPlusClick) this.onPlusClick();
    });
  }

  setActive(tab) {
    this.activeTab = tab;
    this.container.querySelectorAll('.gm-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });
  }
}
