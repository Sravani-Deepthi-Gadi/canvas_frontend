// server/persistence.js
// Simple file-based persistence: saves a room's state to data/<roomId>.json
// and loads it on room creation. Not intended for heavy production use.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}

function statePath(roomId) {
  // sanitize roomId for file name
  const safe = String(roomId).replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

function saveRoom(roomId, state) {
  try {
    const p = statePath(roomId);
    const payload = JSON.stringify(state, null, 2);
    fs.writeFileSync(p, payload, 'utf8');
    // console.log(`Saved state for room ${roomId} -> ${p}`);
  } catch (err) {
    console.error('Error saving room state', err);
  }
}

function loadRoom(roomId) {
  try {
    const p = statePath(roomId);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading room state', err);
    return null;
  }
}

module.exports = { saveRoom, loadRoom };
