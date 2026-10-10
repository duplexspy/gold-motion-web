const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS & safety headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Static assets
const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.xml')) {
      res.setHeader('Content-Type', 'application/xml');
    } else if (filePath.endsWith('.frag') || filePath.endsWith('.vert')) {
      res.setHeader('Content-Type', 'text/plain');
    } else if (filePath.endsWith('.ttf')) {
      res.setHeader('Content-Type', 'font/ttf');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: 'Gold Motion Web',
    version: '8.5.1',
    edition: 'Gold Motion Pro Web',
    time: new Date().toISOString()
  });
});

app.get('/api/sample-project', (req, res) => {
  const samplePath = path.join(__dirname, '../assets/hometab/beta_anim.xml');
  if (fs.existsSync(samplePath)) {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(samplePath);
  } else {
    res.status(404).send('Sample project not found');
  }
});

app.get('/api/effects', (req, res) => {
  const manifestPath = path.join(__dirname, '../assets/effects-manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.sendFile(manifestPath);
  } else {
    res.status(404).json({ error: 'Effects manifest not found' });
  }
});

app.get('/api/shapes', (req, res) => {
  const manifestPath = path.join(__dirname, '../assets/shapes-manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.sendFile(manifestPath);
  } else {
    res.status(404).json({ error: 'Shapes manifest not found' });
  }
});

// Single Page App fallback
app.use((req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Gold Motion Web] Server running at http://0.0.0.0:${PORT}`);
});
