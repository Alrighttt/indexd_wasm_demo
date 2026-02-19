# indexd WASM Demo

Browser-based demo for the indexd WASM SDK, enabling decentralized file storage and retrieval over WebTransport.

## Setup

```bash
npm install
```

This installs `file-type` (used for MIME detection of downloaded files). The bundled version at `vendor/file-type.bundle.js` is already committed, so this step is only needed if you want to update the dependency.

## Updating vendored dependencies

```bash
npm update file-type
npx esbuild --bundle --format=esm --outfile=vendor/file-type.bundle.js node_modules/file-type/core.js
```

## Running

Serve the directory with any static file server:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.
