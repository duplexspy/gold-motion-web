/**
 * Gold Motion Mascot (GOLD) & Gold AI Chat Assistant
 * Loads gold_atlas.json + gold_atlas.png and renders live sprite animations
 */

export class GoldMascot {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.atlasData = null;
    this.atlasImage = null;
    
    this.currentBand = 'meta';
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.fps = 12;

    this.loaded = false;
    this.animationId = null;

    this.messages = [
      "Hey! Ready to animate something golden? ✨",
      "Tip: Press Keyframe to add smooth motion!",
      "Try adding 24K Gold effect from procedural!",
      "I live right here inside Gold Motion! 💛",
      "Ask me anything about keyframes or 3D Labs!"
    ];
    this.msgIndex = 0;

    this.initUI();
    this.loadAtlas();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="gm-mascot-container">
        <div class="gm-mascot-bubble" id="gmMascotBubble">
          ${this.messages[0]}
        </div>
        <div class="gm-mascot-sprite-wrap" id="gmMascotTrigger" title="Click to chat with Gold AI!">
          <canvas id="gmMascotCanvas" width="96" height="96"></canvas>
        </div>
      </div>

      <!-- Gold AI Chat Modal -->
      <div id="gmAiChatModal" class="gm-modal-scrim">
        <div class="gm-modal-card" style="max-width: 440px; height: 560px;">
          <div class="gm-modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--gm-gold-gradient); display: grid; place-items: center; font-size: 13px; font-weight: 800; color: #1a1202;">AI</div>
              <div>
                <h3 style="font-size: 15px;">Gold AI Assistant</h3>
                <span style="font-size: 10px; color: var(--gm-gold-primary); font-weight: 700;">● Online • Puter.js AI</span>
              </div>
            </div>
            <button class="gm-btn gm-btn-icon" id="gmAiChatClose">✕</button>
          </div>
          <div class="gm-modal-body" style="flex: 1; overflow-y: auto; padding: 12px;" id="gmAiMessages">
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--gm-gold-gradient); display: grid; place-items: center; font-size: 11px; font-weight: 800; color: #1a1202; flex-shrink: 0;">AI</div>
              <div style="background: var(--gm-bg-card); border: 1px solid var(--gm-border-subtle); padding: 10px 14px; border-radius: 14px 14px 14px 4px; font-size: 13px; line-height: 1.45; color: #f4f3ef;">
                Hello! I am GOLD, your golden pet and motion design assistant in Gold Motion. How can I help with your project today?
              </div>
            </div>
          </div>
          <div style="padding: 12px; border-top: 1px solid var(--gm-border-subtle); display: flex; gap: 8px;">
            <input type="text" id="gmAiInput" placeholder="Ask about keyframes, effects, 3D Labs…" style="flex: 1; background: var(--gm-bg-input); border: 1px solid var(--gm-border-subtle); border-radius: 10px; padding: 8px 12px; color: #fff; font-size: 13px; outline: none;">
            <button class="gm-btn gm-btn-gold" id="gmAiSend">➜</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#gmMascotCanvas');
    this.ctx = this.canvas.getContext('2d');

    const bubble = this.container.querySelector('#gmMascotBubble');
    const trigger = this.container.querySelector('#gmMascotTrigger');
    const modal = this.container.querySelector('#gmAiChatModal');
    const closeBtn = this.container.querySelector('#gmAiChatClose');

    // Click trigger opens AI Chat
    trigger?.addEventListener('click', () => {
      this.setBand('expr');
      modal?.classList.add('active');
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.remove('active');
      this.setBand('meta');
    });

    // Auto cycle speech bubble every 12 seconds
    setInterval(() => {
      if (modal?.classList.contains('active')) return;
      this.msgIndex = (this.msgIndex + 1) % this.messages.length;
      if (bubble) {
        bubble.textContent = this.messages[this.msgIndex];
        bubble.classList.add('show');
        setTimeout(() => bubble.classList.remove('show'), 4500);
      }
    }, 14000);

    this.setupAiChat();
  }

  setupAiChat() {
    const input = this.container.querySelector('#gmAiInput');
    const sendBtn = this.container.querySelector('#gmAiSend');
    const msgBox = this.container.querySelector('#gmAiMessages');

    const sendMessage = async () => {
      const text = input?.value.trim();
      if (!text) return;
      input.value = '';

      // Append user message
      const userRow = document.createElement('div');
      userRow.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 12px;';
      userRow.innerHTML = `
        <div style="background: var(--gm-gold-gradient); color: #1a1202; font-weight: 600; padding: 10px 14px; border-radius: 14px 14px 4px 14px; font-size: 13px; line-height: 1.45; max-width: 80%;">
          ${text}
        </div>
      `;
      msgBox.appendChild(userRow);
      msgBox.scrollTop = msgBox.scrollHeight;

      this.setBand('action');

      // AI Response
      const aiRow = document.createElement('div');
      aiRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px;';
      aiRow.innerHTML = `
        <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--gm-gold-gradient); display: grid; place-items: center; font-size: 11px; font-weight: 800; color: #1a1202; flex-shrink: 0;">AI</div>
        <div style="background: var(--gm-bg-card); border: 1px solid var(--gm-border-subtle); padding: 10px 14px; border-radius: 14px 14px 14px 4px; font-size: 13px; line-height: 1.45; color: #f4f3ef;">
          Thinking…
        </div>
      `;
      msgBox.appendChild(aiRow);
      msgBox.scrollTop = msgBox.scrollHeight;

      const aiText = aiRow.querySelector('div:last-child');

      // Call Puter AI if online, or intelligent smart responses
      let reply = "";
      if (window.puter && window.puter.ai && typeof window.puter.ai.chat === 'function') {
        try {
          const res = await window.puter.ai.chat(`You are GOLD, a playful golden mascot pet living inside Gold Motion video editor. Answer concisely (1-2 sentences): ${text}`);
          reply = res?.message?.content || String(res);
        } catch (e) {
          reply = this.getSmartReply(text);
        }
      } else {
        reply = this.getSmartReply(text);
      }

      if (aiText) aiText.textContent = reply;
      msgBox.scrollTop = msgBox.scrollHeight;
      this.setBand('emotes');
    };

    sendBtn?.addEventListener('click', sendMessage);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  getSmartReply(q) {
    const query = q.toLowerCase();
    if (query.includes('keyframe') || query.includes('ease') || query.includes('bezier')) {
      return "Use the Graph Editor icon next to keyframes to tweak cubic-bezier easing curves. It makes movement look snappy and natural! ✨";
    }
    if (query.includes('effect') || query.includes('shader') || query.includes('gold')) {
      return "Check out the Effects catalog with 930+ built-in presets! GM 24K Gold and 3D Particles look incredible on shape and text layers. 💛";
    }
    if (query.includes('3d') || query.includes('lab') || query.includes('mesh')) {
      return "Head over to 3D Labs in the bottom navigation! You can test GmQuadTess mesh deformations, particle fields, and 3D camera orbits. 🚀";
    }
    if (query.includes('xml') || query.includes('export') || query.includes('import')) {
      return "Gold Motion supports standard XML import and export. You can share your project XML or export high-res 60fps MP4 and WebM videos anytime! 🎬";
    }
    return "I'm right here with you! Let's craft some stunning motion graphics. Try experimenting with keyframe curves and custom GLSL effects! ✨";
  }

  async loadAtlas() {
    try {
      const res = await fetch('./assets/gold_atlas.json');
      this.atlasData = await res.json();

      const img = new Image();
      img.src = './assets/gold_atlas.png';
      img.onload = () => {
        this.atlasImage = img;
        this.loaded = true;
        this.startLoop();
      };
    } catch (e) {
      console.warn('[GoldMascot] Failed to load atlas, drawing fallback mascot:', e);
      this.loaded = false;
      this.startLoop();
    }
  }

  setBand(bandName) {
    if (this.atlasData && this.atlasData.bands.some(b => b.name === bandName)) {
      this.currentBand = bandName;
      this.currentFrame = 0;
    }
  }

  startLoop() {
    const render = () => {
      this.draw();
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 96, 96);

    if (this.loaded && this.atlasData && this.atlasImage) {
      const band = this.atlasData.bands.find(b => b.name === this.currentBand) || this.atlasData.bands[0];
      if (band && band.frames.length > 0) {
        // Frame timing
        this.frameTimer += 0.016;
        if (this.frameTimer >= 1 / this.fps) {
          this.frameTimer = 0;
          this.currentFrame = (this.currentFrame + 1) % band.frames.length;
        }

        const [x1, y1, x2, y2] = band.frames[this.currentFrame];
        const sw = x2 - x1;
        const sh = y2 - y1;

        ctx.drawImage(this.atlasImage, x1, y1, sw, sh, 8, 8, 80, 80);
        return;
      }
    }

    // Fallback cute mascot drawing
    const t = performance.now() * 0.003;
    const bounce = Math.sin(t * 3) * 3;

    ctx.save();
    ctx.translate(48, 48 + bounce);

    // Golden Body
    const grad = ctx.createRadialGradient(-8, -10, 4, 0, 0, 36);
    grad.addColorStop(0, '#fff4b8');
    grad.addColorStop(0.6, '#f6c945');
    grad.addColorStop(1, '#c2951e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1a1202';
    ctx.beginPath();
    ctx.arc(-11, -4, 4.5, 0, Math.PI * 2);
    ctx.arc(11, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-13, -6, 1.8, 0, Math.PI * 2);
    ctx.arc(9, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#1a1202';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 4, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Cheeks
    ctx.fillStyle = 'rgba(255, 100, 100, 0.35)';
    ctx.beginPath();
    ctx.arc(-18, 4, 4, 0, Math.PI * 2);
    ctx.arc(18, 4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
