// server/rooms.js
const DrawingState = require('./drawing-state');

class Rooms {
  constructor() {
    this.map = new Map();
  }

  has(roomId) {
    return this.map.has(roomId);
  }

  create(roomId) {
    this.map.set(roomId, { users: [], state: DrawingState.create() });
  }

  addUser(roomId, user) {
    const r = this.map.get(roomId);
    if (!r) return;
    r.users.push(user);
  }

  removeUser(roomId, id) {
    const r = this.map.get(roomId);
    if (!r) return;
    r.users = r.users.filter((u) => u.id !== id);
  }

  getUsers(roomId) {
    const r = this.map.get(roomId);
    return r ? r.users : [];
  }

  getState(roomId) {
    const r = this.map.get(roomId);
    return r ? r.state : DrawingState.create();
  }
}

module.exports = Rooms;
