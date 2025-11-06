// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Rooms = require('./rooms');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// serve client statically
app.use(express.static(path.join(__dirname, '..', 'client')));

// in-memory store for rooms
const rooms = new Rooms();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', ({ roomId, meta }) => {
    roomId = roomId || 'default';
    socket.join(roomId);
    socket.roomId = roomId;
    socket.meta = meta || {};

    if (!rooms.has(roomId)) rooms.create(roomId);

    rooms.addUser(roomId, { id: socket.id, meta: socket.meta });

    io.to(roomId).emit('users', rooms.getUsers(roomId));

    const state = rooms.getState(roomId);
    socket.emit('full-state', state);
  });

  socket.on('cursor', (cursor) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    io.to(roomId).emit('cursor', {
      socketId: socket.id,
      x: cursor.x,
      y: cursor.y,
      name: socket.meta?.name,
      color: socket.meta?.color,
    });
  });

  socket.on('op-partial', (partial) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('op-partial', { socketId: socket.id, partial });
  });

  socket.on('op', (op) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = rooms.getState(roomId);
    if (!op.id) op.id = `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    state.ops.push(op);

    if(op.type === 'tombstone'){
      state.tombstones = state.tombstones || [];
      if(op.targetId) state.tombstones.push(op.targetId);
    }

    io.to(roomId).emit('op', op);
  });

  socket.on('undo', () => {
    const roomId = socket.roomId;
    if (!roomId) return;

    const state = rooms.getState(roomId);
    for (let i = state.ops.length - 1; i >= 0; i--) {
      const op = state.ops[i];
      if (op.meta?.origin === socket.id) {
        const tomb = {
          type: 'tombstone',
          id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          targetId: op.id,
          createdAt: Date.now()
        };
        state.tombstones = state.tombstones || [];
        state.tombstones.push(op.id);
        state.ops.push(tomb);
        io.to(roomId).emit('op', tomb);
        break;
      }
    }
  });

  socket.on('redo', () => {
    // Not a full redo system in starter; clients may request full-state
    socket.emit('request-full-state');
  });

  socket.on('request-full-state', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    socket.emit('full-state', rooms.getState(roomId));
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId) {
      rooms.removeUser(roomId, socket.id);
      io.to(roomId).emit('users', rooms.getUsers(roomId));
    }
    console.log('Disconnected:', socket.id);
  });
});

server.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
