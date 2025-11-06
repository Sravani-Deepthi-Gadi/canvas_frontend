

# Real-Time Collaborative Drawing Canvas

A **multi-user real-time drawing application** built with **Vanilla JavaScript**, **HTML5 Canvas**, and **Node.js + Socket.IO**.
Multiple users can draw simultaneously on the same canvas, see each other’s strokes live, and interact with shared tools ,all without using any frontend frameworks.

---

## Features

### Core Drawing Tools

* Brush and Eraser tools
* Adjustable stroke width
* Color picker for custom colors
* Canvas clearing for all users

### Real-Time Synchronization

* Drawings appear instantly across all connected clients
* Smooth, low-latency synchronization via Socket.IO
* Live cursor indicators for connected users
* Room-based collaboration (isolated canvases per room)

### Global Actions

* Undo (using global tombstone-based undo logic)
* Redo (request-based refresh for now)
* Clear Room (wipes canvas for all users)

### User Management

* Shows the number of connected users
* Each user assigned a random color and name (e.g., `Guest-123`)
* Supports multiple rooms (via Room ID input)

---

## Tech Stack

| Layer         | Technology                                               |
| ------------- | -------------------------------------------------------- |
| Frontend      | HTML5, CSS3, Vanilla JavaScript                          |
| Canvas        | HTML Canvas API                                          |
| Real-time     | WebSockets (Socket.IO)                                   |
| Backend       | Node.js + Express                                        |
| Communication | Event-driven (Socket.IO events)                          |
| Deployment    | Render (backend) / Vercel or Netlify (optional frontend) |

---

## Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Frontend UI
│   ├── style.css           # Styles
│   ├── websocket.js        # Socket.IO client setup
│   ├── canvas.js           # Canvas drawing logic
│   └── main.js             # UI event handling
├── server/
│   ├── index.js            # Express + Socket.IO server
│   ├── rooms.js            # Room management
│   ├── drawing-state.js    # Canvas operation history
│   └── persistence.js      # File-based persistence (room state)
├── data/
│   ├── default.json        # Saved room data
│   └── demo.mp4            # Demo video
├── docs/
│   └── demo.png            # Screenshot for README
├── package.json
├── README.md
└── ARCHITECTURE.md
```

---

## Installation & Running Locally

### Prerequisites

Ensure you have **Node.js ≥ 16** installed:

```bash
node -v
npm -v
```

### Setup

```bash
# Clone the repository
git clone https://github.com/Sravani-Deepthi-Gadi/canvas_frontend.git
cd canvas_frontend

# Install dependencies
npm install

# Start the server
npm start
```

You should see:

```
 Server running on http://localhost:3000
```

Then open the following in your browser:

```
http://localhost:3000
```

---

## Testing Collaboration

1. Open `http://localhost:3000` in **two browser tabs** (or on two devices).
2. Click **Join Room** on both, using the same Room ID or leaving it blank.
3. Draw in one window — strokes appear in the other in real time.
4. Try **Undo**, **Redo**, **Clear Room**, and **Eraser** tools.

---

## How It Works

### Client-Side

* Captures mouse/touch movement on the canvas.
* Emits small stroke segments (`op-partial`) for smooth real-time updates.
* Sends a final stroke operation (`op`) once the drawing is complete.
* Reconstructs the canvas by replaying all non-tombstoned operations.

### Server-Side

* Manages rooms and connected users.
* Broadcasts drawing operations to all clients in the room.
* Maintains in-memory lists of all strokes and tombstones.
* Handles Undo by creating a tombstone operation for the last stroke by a user.
* Optionally persists room state to `/data/<room>.json`.

---

## Live Demo

**Render Deployment:**
[https://canvas-frontend-u8jd.onrender.com/](https://canvas-frontend-u8jd.onrender.com/)
*(Note: Render free-tier may take 30–40 seconds to wake from idle.)*

---

## Demo Video:
https://github.com/user-attachments/assets/0722a660-949b-4571-8574-e1b0f998126e

Watch the application in action:

<video width="600" controls>
  <source src="data/demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

Or [download the demo video](data/demo.mp4).

---

## Architecture Summary

### Client

Files: `client/index.html`, `client/canvas.js`, `client/websocket.js`, `client/main.js`

* Collects pointer points, emits `op-partial` and `op`.
* Maintains a local render cache and tombstone set for replay.

### Server

Files: `server/index.js`, `server/rooms.js`, `server/drawing-state.js`, `server/persistence.js`

* Stores ordered ops, tombstones, and per-user undo/redo stacks.
* Emits `op`, `full-state`, handles `undo` and `redo`.
* Saves room state to `data/<room>.json` after updates.

### Protocol Examples

```json
// Stroke operation
{
  "id": "op_...",
  "type": "stroke",
  "points": [...],
  "meta": { "tool": "brush", "color": "#000", "size": 4, "origin": "socketId" },
  "createdAt": 1700000000000
}

// Tombstone (undo)
{
  "id": "tomb_...",
  "type": "tombstone",
  "targetId": "op_...",
  "createdAt": 1700000100000
}

// Untombstone (redo)
{
  "id": "untomb_...",
  "type": "untombstone",
  "targetId": "op_...",
  "createdAt": 1700000200000
}
```

---

## Testing Checklist

* [x] `npm install && npm start`
* [x] Open `http://localhost:3000` in two tabs
* [x] Join same room → strokes sync instantly
* [x] Undo → stroke disappears globally
* [x] Redo → stroke restored
* [x] Clear Room → all canvases cleared
* [x] Restart server → rejoin room → previous ops replayed

---

## Known Limitations

* In-memory replay may slow for very large histories — snapshots recommended.
* File-based persistence for demo only (use MongoDB/Redis in production).
* No authentication — all rooms are public (can be extended easily).

---

## Deployment

Deployed as a single **Render Web Service** (serves both frontend and backend).

**Build and Run Commands:**

```bash
npm install
npm start
```

---

## Development Notes

* All drawing logic uses raw **Canvas API** — no external libraries.
* Partial stroke events throttled (~40ms).
* Canvas scaled to device pixel ratio for crisp rendering.

---

## Time Spent

Approximately **12–16 hours** (development, testing, documentation, and deployment).

---

## License

**MIT License** — feel free to reuse and extend for learning or demo purposes.

---
Project Submission Summary

Project Title: Real-Time Collaborative Drawing Canvas
Author: Sravani Deepthi Gadi
Technology Stack: Node.js, Express, Socket.IO, HTML5 Canvas, Vanilla JavaScript

Live Demo:
🔗 https://canvas-frontend-u8jd.onrender.com/

GitHub Repository:
🔗 https://github.com/Sravani-Deepthi-Gadi/canvas_frontend

Features Implemented:

Real-time synchronized multi-user drawing using WebSockets

Brush and eraser tools with adjustable color and stroke width

Room-based collaboration (isolated canvases per room)

Undo (tombstone-based) and redo (untombstone prototype)

Live user cursors and participant count

Persistent room state saved as JSON

Touch and mouse input support

Technical Highlights:

Efficient partial-stroke batching for low-latency streaming

State replay using operation logs and tombstones

Socket.IO-based event protocol for collaboration

File-based persistence layer for demo reliability

Modular architecture with separate client and server logic

Testing Done:

Verified locally (npm install && npm start)

Tested multi-tab real-time collaboration and undo/redo consistency

Deployed successfully on Render (cold-start delay noted)

Time Invested: ~12–16 hours (design, coding, testing, deployment, and documentation)

Future Enhancements:

Full redo stack with untombstone logic

Database persistence (MongoDB/Redis)

Responsive UI and authentication for private rooms
Demo Video:https://github.com/user-attachments/assets/0722a660-949b-4571-8574-e1b0f998126e

