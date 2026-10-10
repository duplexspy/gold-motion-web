/**
 * Gold Motion WebGL Effect Pipeline & Shader Compiler
 * Compiles and executes the original GLSL fragment shaders from 930+ APK effect definitions
 */

export class EffectPipeline {
  constructor(glCanvas = null) {
    this.manifest = [];
    this.effectsMap = new Map();
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
    // Fullscreen quad buffer
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
    } catch (e) {
      console.error('[EffectPipeline] Failed to load effects manifest:', e);
    }
  }

  getEffect(id) {
    return this.effectsMap.get(id);
  }

  getEffectsByCategory(category) {
    if (!category || category === 'all') return this.manifest;
    return this.manifest.filter((e) => e.category.toLowerCase() === category.toLowerCase());
  }

  searchEffects(query) {
    if (!query) return this.manifest;
    const q = query.toLowerCase();
    return this.manifest.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
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
        // Flip Y for WebGL convention matching Gold Motion
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Process Gold Motion fragment shader code
    let fragBody = effect.shader;

    // Build uniforms header
    let uniformsHeader = `
      precision highp float;
      varying vec2 v_uv;
      uniform vec2 acScreenSize;
      uniform float u_time;
      uniform sampler2D inputImg;
      #define acScreenNorm v_uv
      #define texture2DCv texture2D
    `;

    // Add uniforms from effect params
    if (effect.params) {
      for (const p of effect.params) {
        if (!p.id || p.paramType === 'texture' || p.paramType === 'section') continue;
        if (p.paramType === 'point') {
          uniformsHeader += `\nuniform vec2 ${p.id};`;
        } else if (p.paramType === 'color') {
          uniformsHeader += `\nuniform vec4 ${p.id};`;
        } else if (p.paramType === 'xyz') {
          uniformsHeader += `\nuniform vec3 ${p.id};`;
        } else {
          uniformsHeader += `\nuniform float ${p.id};`;
        }
      }
    }

    // Combine
    let fullFragCode = uniformsHeader + '\n' + fragBody;

    // Check if main() is defined
    if (!fullFragCode.includes('void main()')) {
      fullFragCode = `${uniformsHeader}\nvoid main() {\n${fragBody}\n}`;
    }

    // Compile vertex shader
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertCode);
    gl.compileShader(vs);

    // Compile fragment shader
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fullFragCode);
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

    // Render quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.deleteTexture(tex);
    return this.canvas;
  }
}
