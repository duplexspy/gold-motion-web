/**
 * Gold Motion Timeline Clock & Playback Controller
 */

export class Timeline {
  constructor(options = {}) {
    this.totalTime = options.totalTime || 10000;
    this.fps = options.fps || 30;
    this.currentTime = 0; // ms
    this.isPlaying = false;
    this.loop = true;
    
    this.lastTimestamp = null;
    this.animationFrameId = null;

    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.tick();
    this.onStateChange(true);
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTimestamp = null;
    this.onStateChange(false);
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(ms) {
    this.currentTime = Math.max(0, Math.min(this.totalTime, ms));
    this.onTimeUpdate(this.currentTime);
  }

  seekFrame(frameDelta) {
    const frameMs = 1000 / this.fps;
    this.seek(this.currentTime + frameDelta * frameMs);
  }

  tick() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = now - (this.lastTimestamp || now);
    this.lastTimestamp = now;

    this.currentTime += delta;

    if (this.currentTime >= this.totalTime) {
      if (this.loop) {
        this.currentTime = 0;
      } else {
        this.currentTime = this.totalTime;
        this.pause();
        this.onTimeUpdate(this.currentTime);
        return;
      }
    }

    this.onTimeUpdate(this.currentTime);
    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  formatTimecode(ms = this.currentTime) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const currentFrame = Math.floor((totalSeconds % 1) * this.fps);

    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(minutes)}:${pad(seconds)}:${pad(currentFrame)}`;
  }

  getCurrentFrame() {
    return Math.floor((this.currentTime / 1000) * this.fps);
  }

  getTotalFrames() {
    return Math.floor((this.totalTime / 1000) * this.fps);
  }
}
