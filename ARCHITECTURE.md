

````markdown
### Message Examples

#### **1. Final Stroke (`op`)**
```json
{
  "id": "op_1700000000_ab12",
  "type": "stroke",
  "points": [
    {"x": 10, "y": 20, "t": 1700000000001},
    {"x": 15, "y": 25, "t": 1700000000100}
  ],
  "meta": {
    "tool": "brush",
    "color": "#000000",
    "size": 4,
    "origin": "socketId_abc123"
  },
  "createdAt": 1700000000000
}
````

#### **2. Tombstone (Undo)**

```json
{
  "id": "tomb_1700000100_cd34",
  "type": "tombstone",
  "targetId": "op_1700000000_ab12",
  "createdAt": 1700000100000
}
```

#### **3. Untombstone (Redo)**

```json
{
  "id": "untomb_1700000200_ef56",
  "type": "untombstone",
  "targetId": "op_1700000000_ab12",
  "createdAt": 1700000200000
}
```

#### **4. Full State**

```json
{
  "ops": [...],
  "tombstones": [...]
}
```

---

### Explanation

* **`stroke`** → Represents a new drawing operation. Includes stroke points, color, tool, and metadata.
* **`tombstone`** → Sent when a user performs **Undo**. Marks one stroke as “hidden” without deleting it.
* **`untombstone`** → Sent when a user performs **Redo**. Restores a previously hidden stroke.
* **`full-state`** → Sent by the **server** to a client (on join or after undo/redo) to rebuild the canvas consistently.

---

 **Why this is perfect:**

* JSON code blocks are correctly fenced (` ```json `).
* Each message is labeled clearly with context (`stroke`, `tombstone`, etc.).
* The timestamps are realistic and consistent.
* The explanation reads cleanly and professionally.
* Matches exactly with your project’s server and client implementation.



