/**
 * Gold Motion Procedural Shape Engine
 * Executes procedural shape scripts from assets/shapes/*.xml
 */

export class ShapeEngine {
  constructor() {
    this.shapes = new Map();
    this.loaded = false;
  }

  async init() {
    if (this.loaded) return;
    try {
      const res = await fetch('./assets/shapes-manifest.json');
      const manifest = await res.json();
      for (const item of manifest) {
        // Compile JavaScript function
        let compiledFn = null;
        if (item.script) {
          try {
            // Function getPath(params) is inside item.script
            const fnBody = `${item.script}; return { getPath: typeof getPath === 'function' ? getPath : null, getHandles: typeof getHandles === 'function' ? getHandles : null };`;
            compiledFn = new Function(fnBody)();
          } catch (err) {
            console.warn(`[ShapeEngine] Failed to compile script for ${item.id}:`, err);
          }
        }
        this.shapes.set(item.id, {
          ...item,
          compiled: compiledFn
        });
      }
      this.loaded = true;
      console.log(`[ShapeEngine] Loaded ${this.shapes.size} procedural shapes from APK.`);
    } catch (e) {
      console.error('[ShapeEngine] Failed to load shapes manifest:', e);
    }
  }

  getShape(id) {
    return this.shapes.get(id);
  }

  getAllShapes() {
    return Array.from(this.shapes.values());
  }

  /**
   * Generates path points/curves from shape id and parameters
   */
  generatePath(shapeId, params = {}) {
    const shape = this.shapes.get(shapeId);
    if (!shape || !shape.compiled || !shape.compiled.getPath) {
      return null;
    }

    // Fill defaults
    const effectiveParams = { ...params };
    if (shape.params) {
      for (const p of shape.params) {
        if (!(p.id in effectiveParams) && p.default !== undefined) {
          if (p.default.includes(',')) {
            const parts = p.default.split(',').map(Number);
            effectiveParams[p.id] = { x: parts[0], y: parts[1] };
          } else {
            effectiveParams[p.id] = isNaN(Number(p.default)) ? p.default : Number(p.default);
          }
        }
      }
    }

    try {
      return shape.compiled.getPath(effectiveParams);
    } catch (e) {
      console.error(`[ShapeEngine] Error evaluating shape ${shapeId}:`, e);
      return null;
    }
  }

  /**
   * Renders procedural shape path onto Canvas 2D context
   */
  drawPathToCanvas(ctx, pathData) {
    if (!pathData || !Array.isArray(pathData) || pathData.length === 0) return;

    ctx.beginPath();
    let isFirst = true;

    for (let i = 0; i < pathData.length; i++) {
      const pt = pathData[i];
      if (pt.closed) {
        ctx.closePath();
        continue;
      }

      // Check if it's a bezier curve segment { in, p, out }
      if (pt.p && Array.isArray(pt.p)) {
        const x = pt.p[0];
        const y = pt.p[1];
        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          // If previous point had out and current has in
          const prev = pathData[i - 1];
          if (prev && prev.out && pt.in) {
            ctx.bezierCurveTo(prev.out[0], prev.out[1], pt.in[0], pt.in[1], x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      } else if (Array.isArray(pt) && pt.length >= 2) {
        // Simple point [x, y]
        const x = pt[0];
        const y = pt[1];
        if (isFirst) {
          ctx.moveTo(x, y);
          isFirst = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
  }
}
