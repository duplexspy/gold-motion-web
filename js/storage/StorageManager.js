/**
 * Gold Motion Storage & Persistence Manager
 * Uses browser IndexedDB for reliable offline storage and handles unsaved work alerts
 */

export class StorageManager {
  constructor() {
    this.dbName = 'GoldMotionDB';
    this.dbVersion = 1;
    this.db = null;
    this.hasUnsavedChanges = false;

    this.initDB();
    this.setupSafetyGuards();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          const store = db.createObjectStore('projects', { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('customEffects')) {
          db.createObjectStore('customEffects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      req.onerror = (e) => {
        console.error('[StorageManager] IndexedDB error:', e);
        reject(e);
      };
    });
  }

  setupSafetyGuards() {
    // Warn before unload/refresh if unsaved changes exist
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in Gold Motion! Do you want to export your project before leaving?';
        return e.returnValue;
      }
    });
  }

  setUnsaved(val = true) {
    this.hasUnsavedChanges = val;
  }

  async saveProject(project) {
    if (!this.db) await this.initDB();
    const toSave = {
      id: project.id || String(Date.now()),
      title: project.title || 'Untitled Project',
      width: project.width || 1920,
      height: project.height || 1080,
      bgcolor: project.bgcolor || '#000000',
      totalTime: project.totalTime || 10000,
      fps: project.fps || 30,
      layers: project.layers || [],
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const req = store.put(toSave);

      req.onsuccess = () => {
        this.hasUnsavedChanges = false;
        resolve(toSave);
      };
      req.onerror = (err) => reject(err);
    });
  }

  async getAllProjects() {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (err) => reject(err);
    });
  }

  async getProject(id) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (err) => reject(err);
    });
  }

  async deleteProject(id) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = (err) => reject(err);
    });
  }

  /**
   * One-click full workspace backup (GMBackup) - downloads JSON
   */
  async downloadFullBackup() {
    const projects = await this.getAllProjects();
    const backupData = {
      app: 'Gold Motion Pro Web',
      version: '8.5.1',
      exportedAt: new Date().toISOString(),
      projects
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GoldMotion_Full_Backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Restores workspace from JSON backup
   */
  async restoreBackup(backupJsonString) {
    try {
      const data = JSON.parse(backupJsonString);
      if (data.projects && Array.isArray(data.projects)) {
        for (const proj of data.projects) {
          await this.saveProject(proj);
        }
        return data.projects.length;
      }
    } catch (e) {
      console.error('[StorageManager] Failed to restore backup:', e);
      throw e;
    }
  }
}
