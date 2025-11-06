// main.js — UI glue (complete)
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
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected');
    });

    socket.on('users', (users) => {
      usersCountEl.textContent = Array.isArray(users) ? users.length : '0';
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
    };
    tryWireControls();
  });
})();
