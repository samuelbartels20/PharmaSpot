# Copilot instructions

## Big picture
- Electron app: main process boots in start.js, creates BrowserWindow and loads index.html, and starts the Express server via server.js.
- Renderer entry is renderer.js, which pulls in the POS UI scripts from assets/js (pos.js, product-filter.js, checkout.js).
- Backend is a local HTTP API server (Express) mounted in server.js under /api/* and consumed by the renderer.

## Data storage and config
- Database access is abstracted in db.js with a NeDB-compatible API wrapper for MongoDB; use getCollection("name") in API routes.
- db.config.js controls storage mode: DB_USE_MONGODB=true + MONGODB_URI uses MongoDB, otherwise local NeDB files.
- Local NeDB files live under APPDATA/APPNAME/server/databases/*.db (APPNAME from package.json name).

## API patterns
- Each API module exports an Express app instance (see api/inventory.js, api/users.js) and is mounted in server.js.
- Collections are cached per module (e.g., inventoryDB = getCollection("inventory")) and indexed via ensureIndex.
- IDs are typically numeric (often Date.now()/1000). Many routes sanitize inputs with validator and sanitize-filename.
- Inventory writes can include image uploads via multer; files go to APPDATA/APPNAME/uploads.

## Frontend assets
- UI logic is plain JS under assets/js; renderer.js requires these scripts directly.
- assets/js/utils.js contains shared helpers (money formatting, stock status, file filters, CSP helper).
- Gulp bundles/minifies assets (gulpfile.js) and should be run after JS/CSS changes.

## Developer workflows
- Install deps: npm install
- Run app (Electron Forge): npm run start
- Bundle assets: gulp
- Tests: npm run test (Jest, see tests/utils.test.js)

## External integration
- Socket.io, Electron updater, and other deps are present in package.json; server currently exposes REST-only endpoints.
- The Express server binds to a random port if PORT is unset; renderer uses local API calls.
