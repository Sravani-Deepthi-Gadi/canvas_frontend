// main.js — UI glue (updated with noop handling and undo/redo button state)
(function () {
  // Server URL for socket.io (use same origin if served)
  const serverUrl = (location.protocol && location.host) ? `${location.protocol}//${location.host}` : 'http://localhost:3000';

  const canvasEl = document.getElementById('drawCanvas');
  const cursorsEl = document.getElementById('cursors');

  const socketWrapper = WS; // from websocket.js
  let socket = null;
  let app = null;

  const joinBtn = document.getElementById('joinBtn');
  const roomInput = document.getElementById('roomId');
  const statusEl = document.getElementById('status');
  const usersCountEl = document.getElementById('usersCount');

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  // Helper: enable/disable undo/redo buttons using client-side caches
  function updateUndoRedoButtons(appInstance, sock) {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (!undoBtn || !redoBtn) return;

    // Default disabled until we can evaluate
    undoBtn.disabled = true;
    redoBtn.disabled = true;

    if (!appInstance || !sock || !sock.id) return;

    // Undo is possible if there exists any stroke op in renderCache
    // that was created by this socket and is not tombstoned.
    const cache = appInstance.renderCache || {};
    const tombs = appInstance.tombstones || new Set();

    let undoAvailable = false;
    let redoAvailable = false;

    for (const opId in cache) {
      const op = cache[opId];
      if (!op || op.type !== 'stroke') continue;
      // origin may be on op.meta.origin or op.meta?.origin
      const origin = op.meta && op.meta.origin;
      if (origin === sock.id && !tombs.has(op.id)) {
        undoAvailable = true;
      }
      if (origin === sock.id && tombs.has(op.id)) {
        redoAvailable = true;
      }
      // early exit if both found
      if (undoAvailable && redoAvailable) break;
    }

    undoBtn.disabled = !undoAvailable;
    redoBtn.disabled = !redoAvailable;
  }

  joinBtn.addEventListener('click', () => {
    // prevent multiple joins
    if (socket && socket.id && app) {
      setStatus('Already connected');
      return;
    }

    const roomId = roomInput.value.trim() || 'default';
    const guestName = 'Guest-' + Math.floor(Math.random() * 1000);
    const meta = { name: guestName, color: '#' + Math.floor(Math.random() * 16777215).toString(16) };

    socket = socketWrapper.connect(serverUrl, roomId, meta);

    socket.on('connect', () => {
      setStatus('Connected');
      if (!app) {
        app = new CanvasApp(canvasEl, cursorsEl, socket);
      }

      // Patch emit so 'op' meta.origin is set (server uses this for undo attribution)
      const origEmit = socket.emit.bind(socket);
      socket.emit = (event, data) => {
        try {
          if (event === 'op' && data && typeof data === 'object') {
            data.meta = data.meta || {};
            data.meta.origin = socket.id;
          }
        } catch (e) { /* noop */ }
        return origEmit(event, data);
      };

      // update button state after app is ready
      setTimeout(() => updateUndoRedoButtons(app, socket), 150);
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected');
    });

    socket.on('users', (users) => {
      usersCountEl.textContent = Array.isArray(users) ? users.length : '0';
    });

    // handle server noop responses (nothing to undo/redo)
    socket.on('noop', (payload) => {
      if (!payload || !payload.reason) return;
      if (payload.reason === 'nothing-to-undo') {
        setStatus('Nothing to undo');
      } else if (payload.reason === 'nothing-to-redo') {
        setStatus('Nothing to redo');
      } else {
        setStatus(payload.reason);
      }
      // restore status after short delay
      setTimeout(() => setStatus(socket && socket.connected ? 'Connected' : ''), 1400);
    });

    // update buttons when op or full-state comes in (CanvasApp also handles apply)
    socket.on('op', () => {
      // small timeout to allow CanvasApp to process event
      setTimeout(() => updateUndoRedoButtons(app, socket), 60);
    });
    socket.on('full-state', () => {
      setTimeout(() => updateUndoRedoButtons(app, socket), 120);
    });

    socket.on('op-partial', (payload) => {
      // delivered to CanvasApp via its own listener; optional handling here
    });

    // wire UI controls (retry until app exists)
    const tryWireControls = () => {
      if (!app) return setTimeout(tryWireControls, 100);
      // color
      const colorPicker = document.getElementById('colorPicker');
      colorPicker.addEventListener('change', (e) => (app.color = e.target.value));
      // size
      const sizeRange = document.getElementById('sizeRange');
      sizeRange.addEventListener('input', (e) => (app.size = Number(e.target.value)));
      // tool
      const toolSelect = document.getElementById('toolSelect');
      toolSelect.addEventListener('change', (e) => (app.tool = e.target.value));
      // undo / redo / clear
      document.getElementById('undoBtn').addEventListener('click', () => {
        if (socket) socket.emit('undo');
      });
      document.getElementById('redoBtn').addEventListener('click', () => {
        if (socket) socket.emit('redo');
      });
      document.getElementById('clearBtn').addEventListener('click', () => {
        if (socket) socket.emit('op', { type: 'clear', id: `op_clear_${Date.now()}`, meta: { origin: socket.id } });
      });

      // initial button state
      updateUndoRedoButtons(app, socket);
      // also periodically refresh buttons while app is active (helps UX)
      setInterval(() => updateUndoRedoButtons(app, socket), 1500);
    };
    tryWireControls();
  });
})();
