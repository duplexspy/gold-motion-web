/**
 * Gold Motion Project & Scene Model
 * Encapsulates the complete project hierarchy, layers, transforms, effects, and keyframes.
 */

export class Scene {
  constructor(options = {}) {
    this.title = options.title || 'New Project';
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.bgcolor = options.bgcolor || '#000000';
    this.totalTime = options.totalTime || 10000; // in milliseconds
    this.fps = options.fps || 30;
    this.layers = [];
    this.nextId = 1;

    if (options.layers) {
      this.layers = options.layers;
      this.nextId = Math.max(...this.layers.map(l => Number(l.id) || 0), 0) + 1;
    }
  }

  createLayer(type, options = {}) {
    const layer = {
      id: String(this.nextId++),
      type: type || 'shape', // 'shape', 'text', 'media', 'light', 'camera', 'embedScene'
      label: options.label || `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.layers.length + 1}`,
      tag: options.tag || 'gold', // 'red', 'green', 'blue', 'gold', 'purple'
      startTime: options.startTime !== undefined ? options.startTime : 0,
      endTime: options.endTime !== undefined ? options.endTime : this.totalTime,
      visible: true,
      locked: false,
      blending: options.blending || 'normal', // 'normal', 'exclude', 'screen', 'multiply', etc.
      
      // Transform
      transform: {
        location: options.location || [this.width / 2, this.height / 2],
        scale: options.scale || [1.0, 1.0],
        rotation: options.rotation || 0,
        rotationX: options.rotationX || 0,
        rotationY: options.rotationY || 0,
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
        pivot: options.pivot || [0, 0],
        keyframes: options.keyframes || {
          location: null,
          scale: null,
          rotation: null,
          rotationX: null,
          rotationY: null,
          opacity: null
        }
      },

      // Expressions
      expressions: options.expressions || {},

      // Type-specific properties
      fillType: options.fillType || 'color',
      fillColor: options.fillColor || '#f6c945',
      gradient: options.gradient || null,
      strokeColor: options.strokeColor || '#ffffff',
      strokeWidth: options.strokeWidth || 0,
      
      // Shape
      shapeId: options.shapeId || 'com.alightcreative.shapes.roundrect',
      shapeParams: options.shapeParams || {},
      path: options.path || null,

      // Text
      content: options.content || 'Gold Motion',
      font: options.font || 'Roboto',
      fontSize: options.fontSize || 48,
      align: options.align || 'center',

      // Media
      mediaSrc: options.mediaSrc || null,
      mediaElement: null,

      // Light
      lightType: options.lightType || 'point', // 'point', 'ambient', 'spot'
      lightIntensity: options.lightIntensity || 1.0,
      lightColor: options.lightColor || '#ffffff',

      // Effects stack
      effects: options.effects || []
    };

    return layer;
  }

  addLayer(layer) {
    this.layers.push(layer);
    return layer;
  }

  removeLayer(id) {
    const idx = this.layers.findIndex((l) => l.id === String(id));
    if (idx !== -1) {
      return this.layers.splice(idx, 1)[0];
    }
    return null;
  }

  duplicateLayer(id) {
    const layer = this.getLayer(id);
    if (!layer) return null;
    const cloned = JSON.parse(JSON.stringify(layer));
    cloned.id = String(this.nextId++);
    cloned.label = `${layer.label} Copy`;
    this.layers.push(cloned);
    return cloned;
  }

  getLayer(id) {
    return this.layers.find((l) => l.id === String(id));
  }

  moveLayer(id, newIndex) {
    const oldIndex = this.layers.findIndex((l) => l.id === String(id));
    if (oldIndex === -1 || newIndex < 0 || newIndex >= this.layers.length) return;
    const [layer] = this.layers.splice(oldIndex, 1);
    this.layers.splice(newIndex, 0, layer);
  }

  addKeyframe(layerId, property, time, value, easing = 'cubicBezier 0.42 0.0 0.58 1.0') {
    const layer = this.getLayer(layerId);
    if (!layer) return;

    if (!layer.transform.keyframes[property]) {
      layer.transform.keyframes[property] = [];
    }

    const duration = layer.endTime - layer.startTime;
    const normTime = duration > 0 ? (time - layer.startTime) / duration : 0;
    const clampedTime = Math.max(0, Math.min(1, normTime));

    const existingIdx = layer.transform.keyframes[property].findIndex(
      (kf) => Math.abs(kf.t - clampedTime) < 0.001
    );

    const kfObj = { t: clampedTime, v: value, e: easing };
    if (existingIdx !== -1) {
      layer.transform.keyframes[property][existingIdx] = kfObj;
    } else {
      layer.transform.keyframes[property].push(kfObj);
      layer.transform.keyframes[property].sort((a, b) => a.t - b.t);
    }
  }

  removeKeyframe(layerId, property, time) {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.transform.keyframes[property]) return;

    const duration = layer.endTime - layer.startTime;
    const normTime = duration > 0 ? (time - layer.startTime) / duration : 0;

    layer.transform.keyframes[property] = layer.transform.keyframes[property].filter(
      (kf) => Math.abs(kf.t - normTime) >= 0.005
    );
  }

  toJSON() {
    return {
      title: this.title,
      width: this.width,
      height: this.height,
      bgcolor: this.bgcolor,
      totalTime: this.totalTime,
      fps: this.fps,
      layers: JSON.parse(JSON.stringify(this.layers))
    };
  }

  clone() {
    return new Scene(this.toJSON());
  }
}
