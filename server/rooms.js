// server/rooms.js
// Room manager that integrates persistence and drawing-state restore

const DrawingState = require('./drawing-state');
const Persistence = require('./persistence');

class Rooms {
  constructor() {
    this.map = new Map();
  }

  has(roomId) {
    return this.map.has(roomId);
  }

  create(roomId) {
    // attempt to load persisted state first
    const raw = Persistence.loadRoom(roomId);
    let state;
    if (raw) {
      state = DrawingState.restore(raw);
    } else {
      state = DrawingState.create();
    }
    this.map.set(roomId, { users: [], state });
    return this.map.get(roomId);
  }

  addUser(roomId, user) {
    const r = this.map.get(roomId);
    if (!r) return;
    // avoid duplicate entries
    if (!r.users.find(u => u.id === user.id)) r.users.push(user);
  }

  removeUser(roomId, id) {
    const r = this.map.get(roomId);
    if (!r) return;
    r.users = r.users.filter(u => u.id !== id);
  }

  getUsers(roomId) {
    const r = this.map.get(roomId);
    return r ? r.users : [];
  }

  getState(roomId) {
    const r = this.map.get(roomId);
    return r ? r.state : DrawingState.create();
  }

  // persist the room state to disk
  save(roomId) {
    const r = this.map.get(roomId);
    if (!r) return;
    const serial = DrawingState.serialize(r.state);
    Persistence.saveRoom(roomId, serial);
  }
}

module.exports = Rooms;
