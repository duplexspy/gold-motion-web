/**
 * Gold Motion WebGL Effect Pipeline & Shader Compiler
 * Compiles and executes original GLSL fragment shaders from 930+ APK effect definitions
 * Supports Custom XML Effects (definitions & presets) with shader registration and persistent storage
 */

export class EffectPipeline {
  constructor(glCanvas = null) {
    this.manifest = [];
    this.effectsMap = new Map();
    this.customEffects = [];
    this.gl = null;
    this.canvas = glCanvas;
    this.programs = new Map();
    this.loaded = false;
    this.initGL();
  }

  initGL() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1280;
      this.canvas.height = 720;
    }
    this.gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: true }) ||
              this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true, alpha: true });
    
    if (this.gl) {
      this.initQuad();
    } else {
      console.warn('[EffectPipeline] WebGL not supported, falling back to 2D filters.');
    }
  }

  initQuad() {
    const gl = this.gl;
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,  1, -1, -1,  1,
        -1,  1,  1, -1,  1,  1
      ]),
      gl.STATIC_DRAW
    );
  }

  async init() {
    if (this.loaded) return;
    try {
      const res = await fetch('./assets/effects-manifest.json');
      this.manifest = await res.json();
      for (const eff of this.manifest) {
        this.effectsMap.set(eff.id, eff);
      }
      this.loaded = true;
      console.log(`[EffectPipeline] Loaded ${this.manifest.length} effects from manifest.`);

      // Load custom XML effects from localStorage and pre-bundled APK files
      await this.loadCustomXmlEffects();
    } catch (e) {
      console.error('[EffectPipeline] Failed to load effects manifest:', e);
    }
  }

  async loadCustomXmlEffects() {
    // 1. Load from localStorage
    try {
      const saved = localStorage.getItem('gm_custom_xml_effects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          for (const def of parsed) {
            this.registerCustomEffect(def, false);
          }
        }
      }
    } catch (e) {
      console.warn('[EffectPipeline] Could not load saved custom effects:', e);
    }

    // 2. Load pre-bundled APK custom XML effects if not already present
    const prebundled = [
      { url: './assets/advsharpen.xml', name: 'Advanced Sharpen' },
      { url: './assets/effects_gm3/gm_shake.xml', name: 'GM Camera Shake' },
      { url: './assets/effects_gm3/gm_v53_pack_gm_chromatic_heat_warp.xml', name: 'Chromatic Heat Warp' },
      { url: './assets/effects_gm2/gm_pack_17_liquid_glass.xml', name: 'Liquid Glass Pro' }
    ];

    for (const item of prebundled) {
      try {
        const res = await fetch(item.url);
        if (res.ok) {
          const xml = await res.text();
          this.parseAndRegisterXmlEffect(xml, item.name, false);
        }
      } catch (err) {
        // Optional prebundle fallback
      }
    }
  }

  /**
   * Registers a custom XML effect definition into the pipeline
   */
  registerCustomEffect(effectDef, saveToStorage = true) {
    if (!effectDef || !effectDef.id) return;
    effectDef.isCustomXml = true;
    effectDef.category = effectDef.category || 'custom_xml';

    // If already exists, replace; else unshift to top
    if (this.effectsMap.has(effectDef.id)) {
      const idx = this.manifest.findIndex(e => e.id === effectDef.id);
      if (idx !== -1) this.manifest[idx] = effectDef;
    } else {
      this.manifest.unshift(effectDef);
    }

    this.effectsMap.set(effectDef.id, effectDef);

    if (!this.customEffects.find(e => e.id === effectDef.id)) {
      this.customEffects.unshift(effectDef);
    }

    if (saveToStorage) {
      this.saveCustomEffects();
    }
    console.log(`[EffectPipeline] Registered custom XML effect: ${effectDef.name} (${effectDef.id})`);
  }

  saveCustomEffects() {
    try {
      localStorage.setItem('gm_custom_xml_effects', JSON.stringify(this.customEffects));
    } catch (e) {
      console.warn('[EffectPipeline] Could not save custom effects to localStorage:', e);
    }
  }

  /**
   * Parses XML string into effect definition or presets
   */
  parseAndRegisterXmlEffect(xmlString, defaultName = 'Custom XML Effect', save = true) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML syntax: ' + parserError.textContent);
    }

    // 1. Check for standalone shader-based <effect> definition
    const effectNode = doc.querySelector('effect');
    if (!effectNode) {
      throw new Error('No <effect> element found in the provided XML.');
    }

    const shaderNode = effectNode.querySelector('shader');
    const paramsNode = effectNode.querySelector('params');

    if (shaderNode || paramsNode) {
      // Standalone effect definition
      const id = effectNode.getAttribute('id') || `com.goldmotion.custom.${Date.now()}`;
      const name = effectNode.getAttribute('name') || defaultName;
      const desc = effectNode.getAttribute('desc') || 'Custom Gold Motion XML Effect';
      const category = effectNode.getAttribute('category') || 'custom_xml';
      const thumb = effectNode.getAttribute('thumb') || 'thumb/fx_custom.webp';
      const tags = (effectNode.getAttribute('tags') || 'custom,xml') + ',custom_xml';

      // Parse parameters
      const params = [];
      if (paramsNode) {
        for (const child of paramsNode.children) {
          const p = {
            paramType: child.tagName.toLowerCase(),
            id: child.getAttribute('id') || '',
            label: child.getAttribute('label') || child.getAttribute('id') || '',
            default: child.getAttribute('default') || '0',
            min: child.getAttribute('min') || '0',
            max: child.getAttribute('max') || '1',
            step: child.getAttribute('step') || '0.01'
          };
          params.push(p);
        }
      }

      // Parse shader code
      const shader = shaderNode ? shaderNode.textContent.trim() : '';

      const def = {
        id,
        name,
        desc,
        category,
        thumb,
        tags,
        params,
        shader,
        rawXml: xmlString,
        isCustomXml: true
      };

      this.registerCustomEffect(def, save);
      return { type: 'definition', effect: def };
    }

    // 2. Check for applied effect preset(s)
    const allEffects = doc.querySelectorAll('effect');
    const presets = [];

    for (const eff of allEffects) {
      const id = eff.getAttribute('id');
      if (!id) continue;

      const params = {};
      const keyframes = {};

      // Parse properties / spinners
      for (const prop of eff.querySelectorAll('property, spinner, param')) {
        const pId = prop.getAttribute('id') || prop.getAttribute('name');
        if (!pId) continue;

        if (prop.hasAttribute('value')) {
          params[pId] = parseFloat(prop.getAttribute('value')) || prop.getAttribute('value');
        } else {
          // Check for keyframes
          const kfNodes = prop.querySelectorAll('kf');
          if (kfNodes.length > 0) {
            keyframes[pId] = [];
            for (const kf of kfNodes) {
              keyframes[pId].push({
                t: parseFloat(kf.getAttribute('t')) || 0,
                v: parseFloat(kf.getAttribute('v')) || 0,
                e: kf.getAttribute('e') || 'linear'
              });
            }
          }
        }
      }

      presets.push({ id, params, keyframes });
    }

    return { type: 'preset', effects: presets };
  }

  getEffect(id) {
    return this.effectsMap.get(id);
  }

  getEffectsByCategory(category) {
    if (!category || category === 'all') return this.manifest;
    if (category === 'custom_xml') {
      return this.manifest.filter(e => e.isCustomXml || e.category === 'custom_xml' || (e.tags && e.tags.includes('custom_xml')));
    }
    return this.manifest.filter((e) => e.category.toLowerCase().includes(category.toLowerCase()));
  }

  searchEffects(query, category = 'all') {
    let list = this.manifest;
    if (category && category !== 'all') {
      list = this.getEffectsByCategory(category);
    }
    if (!query) return list;

    const q = query.toLowerCase();
    return list.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.tags && e.tags.toLowerCase().includes(q))
    );
  }

  /**
   * Prepares and compiles a GLSL fragment shader from effect definition
   */
  getShaderProgram(effect) {
    if (!this.gl || !effect.shader) return null;
    if (this.programs.has(effect.id)) {
      return this.programs.get(effect.id);
    }

    const gl = this.gl;
    const vertCode = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Wrap fragment shader with common Gold Motion GLSL uniform headers
    let fragCode = `
      precision highp float;
      varying vec2 v_uv;
      uniform sampler2D inputImg;
      uniform vec2 acScreenSize;
      uniform float u_time;
      #define acTime u_time
      #define acScreenNorm v_uv
      #define vTexCoord v_uv
      #define texture2DCv texture2D
    `;

    // Inject parameter uniform declarations
    if (effect.params) {
      for (const p of effect.params) {
        if (!p.id || p.paramType === 'texture' || p.paramType === 'section') continue;
        if (p.paramType === 'point') {
          fragCode += `uniform vec2 ${p.id};\n`;
        } else if (p.paramType === 'xyz') {
          fragCode += `uniform vec3 ${p.id};\n`;
        } else if (p.paramType === 'color') {
          fragCode += `uniform vec4 ${p.id};\n`;
        } else {
          fragCode += `uniform float ${p.id};\n`;
        }
      }
    }

    fragCode += effect.shader;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertCode);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragCode);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(fs);
      console.warn(`[EffectPipeline] Shader compile error for ${effect.id}:`, info);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(`[EffectPipeline] Program link error for ${effect.id}:`, gl.getProgramInfoLog(program));
      return null;
    }

    const progData = { program, effect };
    this.programs.set(effect.id, progData);
    return progData;
  }

  /**
   * Applies an effect to a source canvas or image, returns output WebGL canvas
   */
  applyEffect(sourceImageOrCanvas, effect, params = {}, time = 0) {
    if (!this.gl) return sourceImageOrCanvas;
    const progData = this.getShaderProgram(effect);
    if (!progData) return sourceImageOrCanvas;

    const gl = this.gl;
    const program = progData.program;

    // Resize GL canvas
    const w = sourceImageOrCanvas.width || 1280;
    const h = sourceImageOrCanvas.height || 720;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);

    gl.useProgram(program);

    // Set vertex attributes
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Set built-in uniforms
    const uScreen = gl.getUniformLocation(program, 'acScreenSize');
    if (uScreen) gl.uniform2f(uScreen, w, h);

    const uTime = gl.getUniformLocation(program, 'u_time');
    if (uTime) gl.uniform1f(uTime, time);

    // Bind source texture
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImageOrCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uInput = gl.getUniformLocation(program, 'inputImg');
    if (uInput) gl.uniform1i(uInput, 0);

    // Set custom parameter uniforms
    if (effect.params) {
      for (const p of effect.params) {
        if (!p.id || p.paramType === 'texture') continue;
        const val = p.id in params ? params[p.id] : (p.default !== undefined ? parseFloat(p.default) : 0);
        const loc = gl.getUniformLocation(program, p.id);
        if (loc) {
          if (p.paramType === 'point' && typeof val === 'object') {
            gl.uniform2f(loc, val.x || 0, val.y || 0);
          } else if (p.paramType === 'xyz' && typeof val === 'object') {
            gl.uniform3f(loc, val.x || 0, val.y || 0, val.z || 0);
          } else {
            gl.uniform1f(loc, typeof val === 'number' ? val : parseFloat(val) || 0);
          }
        }
      }
    }

    // Render fullscreen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Clean texture
    gl.deleteTexture(tex);

    return this.canvas;
  }
}
