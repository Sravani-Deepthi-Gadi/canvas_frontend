// server/index.js 
// Node + Express + Socket.IO server with per-user undo/redo and file persistence

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

// in-memory store for rooms (with persistence support)
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

    // notify users list
    io.to(roomId).emit('users', rooms.getUsers(roomId));

    // send full-state (serialized) to the new client
    const state = rooms.getState(roomId);
    // send ops and tombstones and stacks (clients use ops + tombstones)
    socket.emit('full-state', {
      ops: state.ops,
      tombstones: state.tombstones
    });
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

    // ensure op has id
    if (!op.id) op.id = `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // push op into history
    state.ops.push(op);

    // If it's a normal stroke (or clear), attribute it for undo stacks
    if (op.type === 'stroke' && op.meta && op.meta.origin) {
      const origin = op.meta.origin;
      state.userUndoStacks[origin] = state.userUndoStacks[origin] || [];
      state.userUndoStacks[origin].push(op.id);
      // clear redo stack for this user on new op
      state.userRedoStacks[origin] = [];
    }

    // If op is tombstone/untombstone, update tombstones array accordingly
    if (op.type === 'tombstone' && op.targetId) {
      state.tombstones = state.tombstones || [];
      if (!state.tombstones.includes(op.targetId)) state.tombstones.push(op.targetId);
    } else if (op.type === 'untombstone' && op.targetId) {
      state.tombstones = state.tombstones || [];
      state.tombstones = state.tombstones.filter(id => id !== op.targetId);
    }

    // Broadcast canonical op to all clients
    io.to(roomId).emit('op', op);

    // persist the room state after mutation
    rooms.save(roomId);
  });

  socket.on('undo', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = rooms.getState(roomId);
    const origin = socket.id;
    state.userUndoStacks[origin] = state.userUndoStacks[origin] || [];
    state.userRedoStacks[origin] = state.userRedoStacks[origin] || [];

    const opId = state.userUndoStacks[origin].pop();
    if (opId) {
      // mark tombstone
      state.tombstones = state.tombstones || [];
      if (!state.tombstones.includes(opId)) state.tombstones.push(opId);

      // push to redo stack
      state.userRedoStacks[origin].push(opId);

      const tomb = {
        type: 'tombstone',
        id: `tomb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        targetId: opId,
        createdAt: Date.now()
      };
      state.ops.push(tomb);
      io.to(roomId).emit('op', tomb);

      // persist
      rooms.save(roomId);
    } else {
      // nothing to undo for this user
      socket.emit('noop', { reason: 'nothing-to-undo' });
    }
  });

  socket.on('redo', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = rooms.getState(roomId);
    const origin = socket.id;
    state.userRedoStacks[origin] = state.userRedoStacks[origin] || [];
    state.userUndoStacks[origin] = state.userUndoStacks[origin] || [];

    const opId = state.userRedoStacks[origin].pop();
    if (opId) {
      // remove tombstone if present
      state.tombstones = state.tombstones || [];
      state.tombstones = state.tombstones.filter(id => id !== opId);

      // push back to undo stack
      state.userUndoStacks[origin].push(opId);

      const untomb = {
        type: 'untombstone',
        id: `untomb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        targetId: opId,
        createdAt: Date.now()
      };
      state.ops.push(untomb);
      io.to(roomId).emit('op', untomb);

      // persist
      rooms.save(roomId);
    } else {
      socket.emit('noop', { reason: 'nothing-to-redo' });
    }
  });

  socket.on('request-full-state', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = rooms.getState(roomId);
    socket.emit('full-state', {
      ops: state.ops,
      tombstones: state.tombstones
    });
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
