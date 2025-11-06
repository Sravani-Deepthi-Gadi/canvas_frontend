### Message examples

**Final stroke (op)**
```json
{
  "id": "op_1700000000_ab12",
  "type": "stroke",
  "points":[{"x":10,"y":20,"t":...}, ...],
  "meta": {"tool":"brush","color":"#000","size":4,"origin":"socketId_..."},
  "createdAt": 1700000000000
}
Tombstone (undo)
{
  "id":"tomb_1700000100_cd34",
  "type":"tombstone",
  "targetId":"op_1700000000_ab12",
  "createdAt":1700000100000
}
Untombstone (redo)
{
  "id":"untomb_1700000200_ef56",
  "type":"untombstone",
  "targetId":"op_1700000000_ab12",
  "createdAt":1700000200000
}
Full state
{
  "ops": [...],
  "tombstones": [...]
}
Explanation:

stroke → represents a new drawing operation (points, color, tool).

tombstone → sent when a user performs Undo. Marks one stroke as hidden.

untombstone → sent when a user performs Redo. Restores a previously hidden stroke.

full-state → sent from server to a newly joined client (or when replay is required) to rebuild the canvas.