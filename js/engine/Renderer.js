/**
 * Gold Motion Hybrid WebGL / Canvas2D High Performance Renderer
 */

import { KeyframeEngine } from './Keyframes.js';

export class Renderer {
  constructor(canvas, effectPipeline, shapeEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.effectPipeline = effectPipeline;
    this.shapeEngine = shapeEngine;
    this.selectedLayerId = null;
  }

  render(scene, time) {
    if (!scene || !this.canvas) return;

    const ctx = this.ctx;
    const w = scene.width;
    const h = scene.height;

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    // 1. Clear & Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = scene.bgcolor || '#000000';
    ctx.fillRect(0, 0, w, h);

    // 2. Render Layers in ascending track order
    for (const layer of scene.layers) {
      if (!layer.visible) continue;
      if (time < layer.startTime || time > layer.endTime) continue;

      this.renderLayer(ctx, layer, time, scene);
    }

    // 3. Render selection transform gizmo
    if (this.selectedLayerId) {
      const selected = scene.getLayer(this.selectedLayerId);
      if (selected && selected.visible && time >= selected.startTime && time <= selected.endTime) {
        this.renderGizmo(ctx, selected, time);
      }
    }
  }

  renderLayer(ctx, layer, time, scene) {
    ctx.save();

    // Normalized progress for layer duration
    const duration = layer.endTime - layer.startTime;
    const normT = duration > 0 ? (time - layer.startTime) / duration : 0;

    // Evaluate Transform
    const loc = KeyframeEngine.evaluate(
      layer.transform.keyframes?.location,
      normT,
      layer.transform.location || [scene.width / 2, scene.height / 2]
    );

    const scale = KeyframeEngine.evaluate(
      layer.transform.keyframes?.scale,
      normT,
      layer.transform.scale || [1.0, 1.0]
    );

    const rotation = KeyframeEngine.evaluate(
      layer.transform.keyframes?.rotation,
      normT,
      layer.transform.rotation || 0
    );

    const opacity = KeyframeEngine.evaluate(
      layer.transform.keyframes?.opacity,
      normT,
      layer.transform.opacity !== undefined ? layer.transform.opacity : 1.0
    );

    const rotX = KeyframeEngine.evaluate(
      layer.transform.keyframes?.rotationX,
      normT,
      layer.transform.rotationX || 0
    );

    const rotY = KeyframeEngine.evaluate(
      layer.transform.keyframes?.rotationY,
      normT,
      layer.transform.rotationY || 0
    );

    // Blending mode
    if (layer.blending && layer.blending !== 'normal') {
      ctx.globalCompositeOperation = layer.blending === 'exclude' ? 'difference' : layer.blending;
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    // Matrix Transformation
    const posX = Array.isArray(loc) ? loc[0] : (loc?.x || 0);
    const posY = Array.isArray(loc) ? loc[1] : (loc?.y || 0);
    const scaleX = Array.isArray(scale) ? scale[0] : (scale?.x || 1);
    const scaleY = Array.isArray(scale) ? scale[1] : (scale?.y || 1);

    ctx.translate(posX, posY);

    // Apply 3D Rotation perspective skew (GoldMotionRotationX/Y)
    if (rotX || rotY) {
      const radX = (rotX * Math.PI) / 180;
      const radY = (rotY * Math.PI) / 180;
      // 3D projection matrix simulation
      ctx.transform(
        Math.cos(radY),
        Math.sin(radY) * Math.sin(radX),
        0,
        Math.cos(radX),
        0,
        0
      );
    }

    // 2D Rotation (degrees to radians)
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scaleX, scaleY);

    // Draw Content depending on layer type
    if (layer.type === 'shape') {
      this.drawShapeLayer(ctx, layer);
    } else if (layer.type === 'text') {
      this.drawTextLayer(ctx, layer);
    } else if (layer.type === 'media') {
      this.drawMediaLayer(ctx, layer);
    } else if (layer.type === 'light') {
      this.drawLightLayer(ctx, layer, scene);
    }

    ctx.restore();
  }

  drawShapeLayer(ctx, layer) {
    let fillStyle = layer.fillColor || '#f6c945';
    if (layer.fillType === 'gradient' && layer.gradient) {
      const g = layer.gradient;
      const sPts = (g.start || '0,0').split(',').map(Number);
      const ePts = (g.end || '1,1').split(',').map(Number);
      const w = 540;
      const h = 540;
      const x1 = (sPts[0] - 0.5) * w;
      const y1 = (sPts[1] - 0.5) * h;
      const x2 = (ePts[0] - 0.5) * w;
      const y2 = (ePts[1] - 0.5) * h;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, this.parseHexColor(g.startColor));
      grad.addColorStop(1, this.parseHexColor(g.endColor));
      fillStyle = grad;
    }

    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = layer.strokeColor || '#ffffff';
    ctx.lineWidth = layer.strokeWidth || 0;

    // Check if procedural shape from assets/shapes
    if (layer.shapeId && this.shapeEngine) {
      const pathData = this.shapeEngine.generatePath(layer.shapeId, layer.shapeParams);
      if (pathData) {
        this.shapeEngine.drawPathToCanvas(ctx, pathData);
        if (layer.fillColor) ctx.fill();
        if (layer.strokeWidth > 0) ctx.stroke();
        ctx.restore();
        return;
      }
    }

    // Fallback or explicit SVG path string
    if (layer.path) {
      const p2d = new Path2D(layer.path);
      if (layer.fillColor) ctx.fill(p2d);
      if (layer.strokeWidth > 0) ctx.stroke(p2d);
    } else {
      // Default rounded rectangle
      const w = 200;
      const h = 200;
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      if (layer.strokeWidth > 0) ctx.stroke();
    }
    ctx.restore();
  }

  drawTextLayer(ctx, layer) {
    ctx.save();
    const size = layer.fontSize || 48;
    const font = layer.font || 'Roboto';
    ctx.font = `700 ${size}px "${font}", Roboto, sans-serif`;
    ctx.fillStyle = layer.fillColor || '#ffffff';
    ctx.textAlign = layer.align || 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(layer.content || '', 0, 0);
    if (layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.strokeColor || '#000000';
      ctx.lineWidth = layer.strokeWidth;
      ctx.strokeText(layer.content || '', 0, 0);
    }
    ctx.restore();
  }

  drawMediaLayer(ctx, layer) {
    if (layer.mediaElement && (layer.mediaElement.complete || layer.mediaElement.readyState >= 2)) {
      const el = layer.mediaElement;
      const w = el.videoWidth || el.naturalWidth || 400;
      const h = el.videoHeight || el.naturalHeight || 300;
      ctx.drawImage(el, -w / 2, -h / 2, w, h);
    } else if (layer.mediaSrc) {
      if (!layer.mediaElement) {
        const img = new Image();
        img.src = layer.mediaSrc;
        layer.mediaElement = img;
      }
    } else {
      // Placeholder media box
      ctx.fillStyle = '#222636';
      ctx.fillRect(-150, -100, 300, 200);
      ctx.strokeStyle = '#f6c945';
      ctx.strokeRect(-150, -100, 300, 200);
    }
  }

  drawLightLayer(ctx, layer, scene) {
    // 3D Light layer visualizer
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 400);
    grad.addColorStop(0, layer.lightColor || '#ffffff');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 400, 0, Math.PI * 2);
    ctx.fill();
  }

  renderGizmo(ctx, layer, time) {
    ctx.save();
    const duration = layer.endTime - layer.startTime;
    const normT = duration > 0 ? (time - layer.startTime) / duration : 0;
    const loc = KeyframeEngine.evaluate(layer.transform.keyframes?.location, normT, layer.transform.location);
    const posX = Array.isArray(loc) ? loc[0] : (loc?.x || 0);
    const posY = Array.isArray(loc) ? loc[1] : (loc?.y || 0);

    ctx.translate(posX, posY);
    ctx.strokeStyle = '#f6c945';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    const boxSize = 120;
    ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);

    // Control handles
    ctx.setLineDash([]);
    ctx.fillStyle = '#f6c945';
    const handleSize = 7;
    const corners = [
      [-boxSize / 2, -boxSize / 2],
      [boxSize / 2, -boxSize / 2],
      [boxSize / 2, boxSize / 2],
      [-boxSize / 2, boxSize / 2]
    ];
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    }
    ctx.restore();
  }

  parseHexColor(col) {
    if (!col) return '#ffffff';
    if (col.startsWith('#') && col.length === 9) {
      const a = parseInt(col.substring(1, 3), 16) / 255;
      const r = parseInt(col.substring(3, 5), 16);
      const g = parseInt(col.substring(5, 7), 16);
      const b = parseInt(col.substring(7, 9), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
    return col;
  }
}
