/**
 * Gold Motion Keyframe Interpolation & Bezier Solver Engine
 * 100% compatible with Alight Motion / Gold Motion XML keyframe schema (<kf t="..." v="..." e="..." />)
 */

export class KeyframeEngine {
  /**
   * Solves Cubic Bezier y given x for easing curve: cubicBezier x1 y1 x2 y2
   */
  static solveCubicBezier(x1, y1, x2, y2, t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Fast Newton-Raphson solver to find parametric parameter u for given t (x)
    let u = t;
    for (let i = 0; i < 8; i++) {
      const currentX = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
      const slope = 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
      if (Math.abs(slope) < 1e-6) break;
      const error = currentX - t;
      u -= error / slope;
      u = Math.max(0, Math.min(1, u));
      if (Math.abs(error) < 1e-5) break;
    }

    // Evaluate y(u)
    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  }

  /**
   * Parses easing string: e.g. "cubicBezier 0.42 0.0 0.58 1.0" or "linear"
   */
  static parseEasing(easingStr) {
    if (!easingStr || easingStr === 'linear') {
      return (t) => t;
    }
    if (easingStr.startsWith('cubicBezier')) {
      const parts = easingStr.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 4) {
        return (t) => this.solveCubicBezier(parts[0], parts[1], parts[2], parts[3], t);
      }
    }
    if (easingStr === 'easeIn') {
      return (t) => this.solveCubicBezier(0.42, 0.0, 1.0, 1.0, t);
    }
    if (easingStr === 'easeOut') {
      return (t) => this.solveCubicBezier(0.0, 0.0, 0.58, 1.0, t);
    }
    if (easingStr === 'easeInOut') {
      return (t) => this.solveCubicBezier(0.42, 0.0, 0.58, 1.0, t);
    }
    return (t) => t;
  }

  /**
   * Interpolates value at normalized time `t` (0.0 to 1.0) given a list of keyframes
   * Keyframes: [{ t: 0.0, v: [x, y], e: 'cubicBezier ...' }, ...]
   */
  static evaluate(keyframes, t, defaultValue) {
    if (!keyframes || keyframes.length === 0) {
      return defaultValue;
    }
    if (keyframes.length === 1) {
      return keyframes[0].v;
    }

    // Sort by time
    const sorted = [...keyframes].sort((a, b) => a.t - b.t);

    if (t <= sorted[0].t) {
      return sorted[0].v;
    }
    if (t >= sorted[sorted.length - 1].t) {
      return sorted[sorted.length - 1].v;
    }

    // Find segment
    for (let i = 0; i < sorted.length - 1; i++) {
      const kfA = sorted[i];
      const kfB = sorted[i + 1];

      if (t >= kfA.t && t <= kfB.t) {
        const segSpan = kfB.t - kfA.t;
        const rawProgress = segSpan > 0 ? (t - kfA.t) / segSpan : 0;
        
        // Easing function is stored on kfB in Gold Motion XML schema
        const easeFn = this.parseEasing(kfB.e);
        const progress = easeFn(rawProgress);

        return this.interpolateValues(kfA.v, kfB.v, progress);
      }
    }

    return sorted[sorted.length - 1].v;
  }

  static interpolateValues(valA, valB, p) {
    if (typeof valA === 'number' && typeof valB === 'number') {
      return valA + (valB - valA) * p;
    }
    if (Array.isArray(valA) && Array.isArray(valB)) {
      return valA.map((v, idx) => {
        const target = valB[idx] !== undefined ? valB[idx] : v;
        return v + (target - v) * p;
      });
    }
    if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
      if ('x' in valA && 'x' in valB) {
        return {
          x: valA.x + (valB.x - valA.x) * p,
          y: valA.y + (valB.y - valA.y) * p,
          z: (valA.z || 0) + ((valB.z || 0) - (valA.z || 0)) * p
        };
      }
    }
    return p < 0.5 ? valA : valB;
  }

  /**
   * Helper to parse string values from XML: e.g. "960.000000,540.000000" -> [960, 540]
   */
  static parseValue(valStr) {
    if (typeof valStr !== 'string') return valStr;
    if (valStr.includes(',')) {
      const nums = valStr.split(',').map((s) => parseFloat(s.trim()));
      return nums;
    }
    const num = parseFloat(valStr);
    return isNaN(num) ? valStr : num;
  }
}
