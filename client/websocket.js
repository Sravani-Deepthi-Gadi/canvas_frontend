// websocket.js - simple socket.io wrapper
const WS = (() => {
  let socket = null;

  function connect(serverUrl, roomId, meta) {
    // If serverUrl is falsy, fallback to same origin
    const url = serverUrl || (location.protocol + '//' + location.host);
    socket = io(url, { transports: ['websocket'] });

    socket.on('connect', () => {
      console.log('connected', socket.id);
      socket.emit('join-room', { roomId, meta });
    });

    return socket;
  }

  function on(event, cb) { if (!socket) return; socket.on(event, cb); }
  function emit(event, data) { if (!socket) return; socket.emit(event, data); }
  function id() { return socket ? socket.id : null; }

  return { connect, on, emit, id };
})();
