// canvas.js - core canvas logic + realtime apply with incremental undo/redo

class CanvasApp {
  constructor(canvasEl, cursorsEl, socket, opts = {}) {
    this.canvas = canvasEl;
    this.cursorsEl = cursorsEl;
    this.socket = socket;
    this.ctx = this.canvas.getContext('2d');

    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.drawing = false;
    this.tool = 'brush';
    this.color = '#000000';
    this.size = 4;

    this.currentPath = [];
    this.lastEmit = 0;

    // new: caches and state trackers
    this.renderCache = {}; // id -> op
    this.tombstones = new Set();

    // event bindings: remote events
    this.socket.on('op', (op) => this.applyRemoteOp(op));
    this.socket.on('full-state', (state) => this.rebuildFromState(state));
    this.socket.on('cursor', (c) => this.updateCursor(c));
    this.socket.on('op-partial', (payload) => this.applyRemotePartial(payload));

    this.initInput();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.clientWidth || window.innerWidth;
    const h = rect.height || this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(w * this.devicePixelRatio);
    this.canvas.height = Math.floor(h * this.devicePixelRatio);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    this.clearCanvasLocal(); // keep blank until state replay
  }

  initInput() {
    const start = (e) => {
      this.drawing = true;
      this.currentPath = [];
      const p = this.getPoint(e);
      this.currentPath.push(p);
      this.lastEmit = Date.now();
    };
    const move = (e) => {
      const p = this.getPoint(e);
      if (this.drawing) {
        const prev = this.currentPath[this.currentPath.length - 1];
        this.currentPath.push(p);
        this.drawSegment(prev, p, this.color, this.size, this.tool);

        const now = Date.now();
        if (now - this.lastEmit > 40) {
          this.emitPathPartial(this.currentPath.slice(-8));
          this.lastEmit = now;
        }
      }
      // always send cursor position
      this.socket.emit('cursor', { x: p.x, y: p.y });
    };
    const end = (e) => {
      if (!this.drawing) return;
      this.drawing = false;
      if (this.currentPath.length > 1) {
        const op = this.packageOp(this.currentPath, this.tool, this.color, this.size);
        this.socket.emit('op', op);
        this.renderCache[op.id] = op; // cache locally
      }
      this.currentPath = [];
    };

    // mouse
    this.canvas.addEventListener('mousedown', (e) => start(e));
    this.canvas.addEventListener('mousemove', (e) => move(e));
    window.addEventListener('mouseup', (e) => end(e));

    // touch
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e.touches[0]); });
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e.touches[0]); });
    this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); end(e.changedTouches[0]); });
  }

  getPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: Date.now() };
  }

  drawSegment(p1, p2, color, size, tool) {
    if (!p1 || !p2) return;
    this.ctx.save();
    if (tool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = size * 2;
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.lineWidth = size;
      this.ctx.strokeStyle = color;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  emitPathPartial(points) {
    const partial = {
      type: 'partial',
      points,
      meta: { tool: this.tool, color: this.color, size: this.size }
    };
    this.socket.emit('op-partial', partial);
  }

  packageOp(points, tool, color, size) {
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: 'stroke',
      points,
      meta: { tool, color, size },
      createdAt: Date.now()
    };
  }

  applyRemotePartial(payload) {
    const p = payload.partial;
    if (!p || !p.points) return;
    for (let i = 1; i < p.points.length; i++) {
      this.drawSegment(p.points[i - 1], p.points[i], p.meta.color, p.meta.size, p.meta.tool);
    }
  }

  applyRemoteOp(op) {
    if (!op) return;
    if (op.type === 'stroke') {
      this.renderCache[op.id] = op;
      this.drawStroke(op);
    } else if (op.type === 'clear') {
      this.clearCanvasLocal();
      this.renderCache = {};
      this.tombstones.clear();
    } else if (op.type === 'tombstone') {
      // mark hidden and replay without full-state request
      if (op.targetId) {
        this.tombstones.add(op.targetId);
        this.replayAll();
      }
    } else if (op.type === 'untombstone') {
      if (op.targetId) {
        this.tombstones.delete(op.targetId);
        this.replayAll();
      }
    }
  }

  drawStroke(op) {
    const pts = op.points;
    if (!Array.isArray(pts) || pts.length < 2) return;
    for (let i = 1; i < pts.length; i++) {
      this.drawSegment(pts[i - 1], pts[i], op.meta.color, op.meta.size, op.meta.tool);
    }
  }

  replayAll() {
    this.clearCanvasLocal();
    for (const opId in this.renderCache) {
      const op = this.renderCache[opId];
      if (!op || op.type !== 'stroke') continue;
      if (this.tombstones.has(op.id)) continue;
      this.drawStroke(op);
    }
  }

  rebuildFromState(state) {
    this.clearCanvasLocal();
    this.renderCache = {};
    this.tombstones = new Set(state.tombstones || []);
    for (const op of state.ops || []) {
      if (op.type === 'stroke') {
        this.renderCache[op.id] = op;
      }
    }
    this.replayAll();
  }

  updateCursor({ socketId, x, y, name, color }) {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    let el = document.querySelector(`#cursor-${socketId}`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'cursor';
      el.id = `cursor-${socketId}`;
      this.cursorsEl.appendChild(el);
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.textContent = name ? name.slice(0, 8) : socketId.slice(0, 4);
    el.style.background = color || 'rgba(0,0,0,0.7)';
  }

  clearCanvasLocal() {
    this.ctx.clearRect(
      0,
      0,
      this.canvas.width / this.devicePixelRatio,
      this.canvas.height / this.devicePixelRatio
    );
  }
}

window.CanvasApp = CanvasApp;
