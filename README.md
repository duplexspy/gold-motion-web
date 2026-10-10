# ✨ Gold Motion Web

> **Professional Motion Graphics & Visual Effects Studio ported directly from the Gold Motion APK.**  
> Featuring 930+ procedural GLSL shaders, 3D Labs Studio, cubic-bezier easing, Alight XML interoperability, and the interactive GOLD mascot.

![Gold Motion Pro](icons/ic_launcher_round.png)

---

## 🚀 Live Demo & Hosting on GitHub Pages

This repository is pre-configured for instant zero-configuration static deployment on **GitHub Pages**.

### 🌟 How to Enable GitHub Pages (Choose either method):

#### Method 1: Automated GitHub Actions (Recommended)
1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. On GitHub, navigate to **Settings** ➔ **Pages**.
3. Under **Build and deployment** ➔ **Source**, select **GitHub Actions**.
4. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) will automatically trigger and deploy your site to `https://<your-username>.github.io/<your-repo-name>/`.

#### Method 2: Deploy from Branch
1. On GitHub, navigate to **Settings** ➔ **Pages**.
2. Under **Build and deployment** ➔ **Source**, select **Deploy from a branch**.
3. Under **Branch**, select `main` (or `master`) and folder `/(root)`.
4. Click **Save**. Your site will be live within 30 seconds!

---

## 🎨 Features Ported from Gold Motion APK

- **930+ Procedural GLSL Shaders:** WebGL shader compilation pipeline running the original fragment shaders with `acScreenSize`, `acScreenNorm`, `u_time`, and custom uniforms.
- **Procedural Vector Shapes:** Executes JavaScript path generators (`getPath(params)`) from 23 procedural shape definitions.
- **3D Labs Studio:** Real-time 3D orbit camera, particle systems, wireframe quad tessellations (`GmQuadTess`), and point clouds.
- **Extra Tools Studio:** Quality split-view AI upscaler with original APK assets (`1785609380277_upscaled.png`), background cutout, depth elevation, bezier speed ramping, optical tracking, and 35mm film emulation.
- **Interactive GOLD Mascot:** Sprite animation runner using `gold_atlas.json` (3072×2048) & `gold_atlas.png`, speech bubble cycle, and AI assistant chat dialog.
- **XML Import & Export:** 100% compliant Alight / Gold Motion XML schema parser and generator with linear gradient support, keyframes, and easing curves.
- **Keyframe Curves & Expressions:** Interactive cubic-bezier curve editor and expression baking (`wiggle`, `bounce`, `sine`, `inertia`, `pulse`).
- **IndexedDB & Anti-Data Loss Guards:** Project timelines auto-saved locally in browser IndexedDB, `beforeunload` warning before tab close, and 1-click full JSON workspace backup.
- **Multi-Format Media Exporter:** Video (WebM/MP4 up to 4K 60fps), GIF, PNG sequence, XML, and `.amproject` packages.

---

## 💻 Local Development (Node.js & Express)

To run the local development server with API mocks and fast reload:

```bash
# Install dependencies
npm install

# Start local server on http://localhost:3000
npm start
```

---

## 📁 Repository Structure

```text
├── index.html                   # Main application entry point
├── css/
│   └── style.css                # Gold Motion dark & gold UI theme
├── js/
│   ├── app.js                   # Application controller & event wiring
│   ├── engine/                  # Renderer, Keyframes, Shaders, Shapes, Timeline
│   ├── ui/                      # NavBar, Projects, Templates, Graph Editor, Exporter
│   ├── labs/                    # 3D Labs Studio & GmQuadTess
│   ├── tools/                   # Extra Tools Studio (AI Upscale, Cutout, Depth, etc.)
│   ├── expressions/             # ExpressionEngine & Bezier baker
│   ├── mascot/                  # Interactive GOLD pet & AI Chat
│   ├── xml/                     # XML schema import & export
│   └── storage/                 # IndexedDB & backup manager
├── assets/                      # APK fonts, shaders manifest, shapes, atlas
├── icons/                       # Original launcher & category icons
├── server/
│   └── server.js                # Express local development server
├── .github/workflows/
│   └── deploy.yml               # GitHub Actions Pages deployment workflow
└── .nojekyll                    # Disables Jekyll processing on GitHub Pages
```

---

## 📄 License
ISC / Gold Motion APK Port
