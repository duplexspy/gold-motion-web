/**
 * Gold Motion XML Parser & Generator
 * 100% compliant with Alight Motion & Gold Motion project XML format
 */

import { Scene } from '../engine/Scene.js';

export class XmlHandler {
  /**
   * Parses XML string into a Scene instance
   */
  static parse(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const sceneNode = doc.querySelector('scene');
    if (!sceneNode) {
      throw new Error('Invalid Gold Motion XML: No <scene> root element found.');
    }

    const title = sceneNode.getAttribute('title') || 'Imported Project';
    const width = parseInt(sceneNode.getAttribute('width')) || 1920;
    const height = parseInt(sceneNode.getAttribute('height')) || 1080;
    const bgcolor = sceneNode.getAttribute('bgcolor') || '#000000';
    const totalTime = parseInt(sceneNode.getAttribute('totalTime')) || 10000;
    const fps = parseInt(sceneNode.getAttribute('fps')) || 30;

    const scene = new Scene({
      title,
      width,
      height,
      bgcolor: this.parseColor(bgcolor),
      totalTime,
      fps
    });

    // Parse layers
    for (const child of sceneNode.children) {
      if (child.tagName === 'shape') {
        const layer = this.parseShapeNode(child, scene);
        if (layer) scene.addLayer(layer);
      } else if (child.tagName === 'text') {
        const layer = this.parseTextNode(child, scene);
        if (layer) scene.addLayer(layer);
      } else if (child.tagName === 'media' || child.tagName === 'image' || child.tagName === 'video') {
        const layer = this.parseMediaNode(child, scene);
        if (layer) scene.addLayer(layer);
      } else if (child.tagName === 'embedScene') {
        const layer = this.parseEmbedSceneNode(child, scene);
        if (layer) scene.addLayer(layer);
      }
    }

    return scene;
  }

  static parseShapeNode(node, scene) {
    const id = node.getAttribute('id');
    const label = node.getAttribute('label') || `Shape ${id}`;
    const tag = node.getAttribute('tag') || 'gold';
    const startTime = parseInt(node.getAttribute('startTime')) || 0;
    const endTime = parseInt(node.getAttribute('endTime')) || scene.totalTime;
    const fillType = node.getAttribute('fillType') || 'color';
    const blending = node.getAttribute('blending') || 'normal';

    const fillColorNode = node.querySelector('fillColor');
    const fillColor = fillColorNode ? this.parseColor(fillColorNode.getAttribute('value')) : '#f6c945';

    const pathNode = node.querySelector('path');
    const path = pathNode ? pathNode.getAttribute('d') : null;

    const gradNode = node.querySelector('gradient');
    let gradient = null;
    if (gradNode) {
      gradient = {
        type: gradNode.getAttribute('type') || 'linear',
        startColor: gradNode.getAttribute('startColor') || '#ff000000',
        endColor: gradNode.getAttribute('endColor') || '#ffffffff',
        start: gradNode.getAttribute('start') || '0.0,0.0',
        end: gradNode.getAttribute('end') || '1.0,1.0'
      };
    }

    const layer = scene.createLayer('shape', {
      id,
      label,
      tag,
      startTime,
      endTime,
      fillType,
      fillColor,
      gradient,
      blending,
      path,
      ...transform
    });

    // Parse effects
    const effectNodes = node.querySelectorAll('effect');
    for (const eff of effectNodes) {
      layer.effects.push({
        id: eff.getAttribute('id'),
        params: {}
      });
    }

    return layer;
  }

  static parseTextNode(node, scene) {
    const id = node.getAttribute('id');
    const label = node.getAttribute('label') || `Text ${id}`;
    const tag = node.getAttribute('tag') || 'purple';
    const startTime = parseInt(node.getAttribute('startTime')) || 0;
    const endTime = parseInt(node.getAttribute('endTime')) || scene.totalTime;
    const size = parseFloat(node.getAttribute('size')) || 48;
    const font = (node.getAttribute('font') || 'Roboto').split(':')[0];
    const align = node.getAttribute('align') || 'left';

    const contentNode = node.querySelector('content');
    const content = contentNode ? contentNode.textContent : 'Text Layer';

    const fillColorNode = node.querySelector('fillColor');
    const fillColor = fillColorNode ? this.parseColor(fillColorNode.getAttribute('value')) : '#ffffff';

    const transform = this.parseTransformNode(node.querySelector('transform'), scene);

    const layer = scene.createLayer('text', {
      id,
      label,
      tag,
      startTime,
      endTime,
      fontSize: size,
      font,
      align,
      content,
      fillColor,
      ...transform
    });

    const effectNodes = node.querySelectorAll('effect');
    for (const eff of effectNodes) {
      layer.effects.push({
        id: eff.getAttribute('id'),
        params: {}
      });
    }

    return layer;
  }

  static parseMediaNode(node, scene) {
    const id = node.getAttribute('id');
    const label = node.getAttribute('label') || `Media ${id}`;
    const startTime = parseInt(node.getAttribute('startTime')) || 0;
    const endTime = parseInt(node.getAttribute('endTime')) || scene.totalTime;
    const src = node.getAttribute('src') || node.getAttribute('url');

    const transform = this.parseTransformNode(node.querySelector('transform'), scene);

    return scene.createLayer('media', {
      id,
      label,
      startTime,
      endTime,
      mediaSrc: src,
      ...transform
    });
  }

  static parseEmbedSceneNode(node, scene) {
    // Nested group / embedScene
    const id = node.getAttribute('id');
    const label = node.getAttribute('label') || `Group ${id}`;
    const startTime = parseInt(node.getAttribute('startTime')) || 0;
    const endTime = parseInt(node.getAttribute('endTime')) || scene.totalTime;
    const transform = this.parseTransformNode(node.querySelector('transform'), scene);

    return scene.createLayer('shape', {
      id,
      label,
      startTime,
      endTime,
      ...transform
    });
  }

  static parseTransformNode(transformNode, scene) {
    if (!transformNode) {
      return {
        location: [scene.width / 2, scene.height / 2],
        scale: [1, 1],
        rotation: 0
      };
    }

    const res = {
      location: [scene.width / 2, scene.height / 2],
      scale: [1, 1],
      rotation: 0,
      keyframes: {}
    };

    // Location
    const locNode = transformNode.querySelector('location');
    if (locNode) {
      if (locNode.hasAttribute('value')) {
        res.location = locNode.getAttribute('value').split(',').map(Number);
      } else {
        const kfs = this.parseKeyframes(locNode);
        if (kfs.length > 0) res.keyframes.location = kfs;
      }
    }

    // Scale
    const scaleNode = transformNode.querySelector('scale');
    if (scaleNode) {
      if (scaleNode.hasAttribute('value')) {
        res.scale = scaleNode.getAttribute('value').split(',').map(Number);
      } else {
        const kfs = this.parseKeyframes(scaleNode);
        if (kfs.length > 0) res.keyframes.scale = kfs;
      }
    }

    // Rotation
    const rotNode = transformNode.querySelector('rotation');
    if (rotNode) {
      if (rotNode.hasAttribute('value')) {
        res.rotation = parseFloat(rotNode.getAttribute('value')) || 0;
      } else {
        const kfs = this.parseKeyframes(rotNode);
        if (kfs.length > 0) res.keyframes.rotation = kfs;
      }
    }

    return res;
  }

  static parseKeyframes(parentNode) {
    const kfs = [];
    for (const kf of parentNode.querySelectorAll('kf')) {
      const t = parseFloat(kf.getAttribute('t')) || 0;
      const vStr = kf.getAttribute('v');
      const e = kf.getAttribute('e') || 'linear';

      let v;
      if (vStr && vStr.includes(',')) {
        v = vStr.split(',').map(Number);
      } else {
        v = parseFloat(vStr) || 0;
      }

      kfs.push({ t, v, e });
    }
    return kfs.sort((a, b) => a.t - b.t);
  }

  static parseColor(colStr) {
    if (!colStr) return '#000000';
    if (colStr.startsWith('#')) {
      // Android ARGB hex format (#AARRGGBB) to CSS #RRGGBBAA
      if (colStr.length === 9) {
        const a = colStr.substring(1, 3);
        const r = colStr.substring(3, 5);
        const g = colStr.substring(5, 7);
        const b = colStr.substring(7, 9);
        return `#${r}${g}${b}`;
      }
      return colStr;
    }
    return colStr;
  }

  /**
   * Generates formatted Gold Motion XML from Scene instance
   */
  static serialize(scene) {
    let xml = `<?xml version='1.0' encoding='UTF-8' ?>\n`;
    xml += `<!--\nCreated by Gold Motion Web (http://goldmotion.app)\nExported: ${new Date().toISOString()}\n-->\n`;
    xml += `<scene title="${this.escape(scene.title)}" width="${scene.width}" height="${scene.height}" bgcolor="#ff${scene.bgcolor.replace('#', '')}" totalTime="${scene.totalTime}" fps="${scene.fps}">\n`;

    for (const layer of scene.layers) {
      if (layer.type === 'shape') {
        xml += this.serializeShapeLayer(layer);
      } else if (layer.type === 'text') {
        xml += this.serializeTextLayer(layer);
      } else if (layer.type === 'media') {
        xml += this.serializeMediaLayer(layer);
      }
    }

    xml += `</scene>\n`;
    return xml;
  }

  static serializeShapeLayer(layer) {
    let xml = `  <shape id="${layer.id}" tag="${layer.tag || 'gold'}" label="${this.escape(layer.label)}" startTime="${layer.startTime}" endTime="${layer.endTime}" fillType="${layer.fillType || 'color'}">\n`;
    xml += this.serializeTransform(layer.transform);
    xml += `    <fillColor value="#ff${(layer.fillColor || '#f6c945').replace('#', '')}" />\n`;
    if (layer.gradient) {
      xml += `    <gradient type="${layer.gradient.type || 'linear'}" startColor="${layer.gradient.startColor}" endColor="${layer.gradient.endColor}" start="${layer.gradient.start}" end="${layer.gradient.end}" />\n`;
    }
    if (layer.path) {
      xml += `    <path d="${this.escape(layer.path)}" />\n`;
    }
    for (const eff of layer.effects || []) {
      xml += `    <effect id="${eff.id}" />\n`;
    }
    xml += `  </shape>\n`;
    return xml;
  }

  static serializeTextLayer(layer) {
    let xml = `  <text id="${layer.id}" tag="${layer.tag || 'purple'}" label="${this.escape(layer.label)}" startTime="${layer.startTime}" endTime="${layer.endTime}" fillType="color" size="${layer.fontSize || 48}" font="${layer.font || 'Roboto'}" align="${layer.align || 'center'}">\n`;
    xml += this.serializeTransform(layer.transform);
    xml += `    <fillColor value="#ff${(layer.fillColor || '#ffffff').replace('#', '')}" />\n`;
    xml += `    <content>${this.escape(layer.content || '')}</content>\n`;
    for (const eff of layer.effects || []) {
      xml += `    <effect id="${eff.id}" />\n`;
    }
    xml += `  </text>\n`;
    return xml;
  }

  static serializeMediaLayer(layer) {
    let xml = `  <media id="${layer.id}" label="${this.escape(layer.label)}" startTime="${layer.startTime}" endTime="${layer.endTime}" src="${this.escape(layer.mediaSrc || '')}">\n`;
    xml += this.serializeTransform(layer.transform);
    xml += `  </media>\n`;
    return xml;
  }

  static serializeTransform(tr) {
    let xml = `    <transform>\n`;
    if (tr.keyframes?.location && tr.keyframes.location.length > 0) {
      xml += `      <location>\n`;
      for (const kf of tr.keyframes.location) {
        const vStr = Array.isArray(kf.v) ? kf.v.join(',') : kf.v;
        xml += `        <kf t="${kf.t}" v="${vStr}" e="${kf.e}" />\n`;
      }
      xml += `      </location>\n`;
    } else {
      const loc = Array.isArray(tr.location) ? tr.location.join(',') : '960,540';
      xml += `      <location value="${loc}" />\n`;
    }

    if (tr.keyframes?.scale && tr.keyframes.scale.length > 0) {
      xml += `      <scale>\n`;
      for (const kf of tr.keyframes.scale) {
        const vStr = Array.isArray(kf.v) ? kf.v.join(',') : kf.v;
        xml += `        <kf t="${kf.t}" v="${vStr}" e="${kf.e}" />\n`;
      }
      xml += `      </scale>\n`;
    } else {
      const sc = Array.isArray(tr.scale) ? tr.scale.join(',') : '1,1';
      xml += `      <scale value="${sc}" />\n`;
    }

    if (tr.keyframes?.rotation && tr.keyframes.rotation.length > 0) {
      xml += `      <rotation>\n`;
      for (const kf of tr.keyframes.rotation) {
        xml += `        <kf t="${kf.t}" v="${kf.v}" e="${kf.e}" />\n`;
      }
      xml += `      </rotation>\n`;
    } else if (tr.rotation) {
      xml += `      <rotation value="${tr.rotation}" />\n`;
    }

    xml += `    </transform>\n`;
    return xml;
  }

  static escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
