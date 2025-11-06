// server/drawing-state.js
function create() {
  return {
    ops: [],       // all operations: stroke / clear / tombstone
    tombstones: [] // ids of undone operations
  };
}

module.exports = { create };
