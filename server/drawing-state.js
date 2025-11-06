// server/drawing-state.js
// Central in-memory structure for a room's drawing state.
//  includes per-user undo/redo stacks and tombstones.

function create() {
  return {
    ops: [],                     // ordered list of operations (stroke / clear / tombstone / untombstone)
    tombstones: [],              // array of op ids that are currently hidden (undone)
    userUndoStacks: {},          // { userId: [opId,...] }
    userRedoStacks: {}           // { userId: [opId,...] }
  };
}

// Helper: create a deep-clone-friendly serializable snapshot
function serialize(state) {
  return {
    ops: state.ops || [],
    tombstones: state.tombstones || [],
    userUndoStacks: state.userUndoStacks || {},
    userRedoStacks: state.userRedoStacks || {}
  };
}

// Helper: restore from raw persisted object into runtime shape
function restore(raw) {
  const s = create();
  if (!raw) return s;
  s.ops = Array.isArray(raw.ops) ? raw.ops : [];
  s.tombstones = Array.isArray(raw.tombstones) ? raw.tombstones : [];
  s.userUndoStacks = raw.userUndoStacks || {};
  s.userRedoStacks = raw.userRedoStacks || {};
  return s;
}

module.exports = { create, serialize, restore };
