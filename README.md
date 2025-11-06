# Real-Time Collaborative Drawing Canvas

## Quick start

1. Install:
```bash
npm install
Start server (serves client):

npm start


Open browser:

http://localhost:3000


Click "Join Room" (use same room id in multiple tabs to test).

Notes / Limitations

Undo uses a tombstone approach: undo last op by the user (server attribute meta.origin required).

Redo is not fully implemented in this starter.

History stored in memory — add DB for persistence.


---

## 11) `ARCHITECTURE.md` (short)
```md
# Architecture Overview

## Flow
- Client collects pointer points -> emits op-partial for preview and op at stroke end.
- Server stores ops per-room and broadcasts ops to room members.
- Undo uses tombstones: server appends tombstone referencing op id; clients request full-state and replay skipping tombstoned ops.

## Protocol (WebSocket messages)
- `join-room` { roomId, meta }
- `full-state` { ops, tombstones }
- `op-partial` { partial }
- `op` { id, type, points?, meta? }
- `cursor` { x, y }
- `undo`, `redo`

## Undo/Redo
- Undo: last op by this user's origin is tombstoned.
- Redo: not implemented in starter; needs per-user undo stacks or tombstone toggle.

## Performance
- Client throttles partial emits.
- For production persist ops and serve snapshots instead of replaying long op lists.

How to run locally (recap)

From project root:

npm install
npm start


Open http://localhost:3000 in two tabs, click Join Room with same Room ID to see real-time drawing sync.