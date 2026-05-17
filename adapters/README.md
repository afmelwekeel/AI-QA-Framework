# Adapters

Each adapter is a thin module that lets the framework speak a stack's
conventions without coupling skills to a specific tech.

| Folder | Purpose |
|---|---|
| `frontend/` | Per-framework selectors + URL conventions (Angular, React, Vue, ...) |
| `backend/`  | Per-framework route discovery patterns (.NET, Node, Java, Python) |
| `auth/`     | Per-scheme login flows (jwt/oauth/cookie/basic) — add as needed |
| `database/` | Per-engine connection helpers — add as needed |

Adapters are auto-selected by detector output. To add a new one:

1. Create `adapters/<category>/<id>.mjs` exporting `{ id, ... }`
2. Update the relevant detector to recognize it
3. Reference it from skills via `ctx.config.<category>`
