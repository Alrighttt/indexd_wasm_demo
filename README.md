# indexd WASM Demo

Browser-based demo for the indexd WASM SDK, enabling decentralized file storage and retrieval over WebTransport.

## Setup

```bash
npm install
```

This installs `file-type` (MIME detection) and `mp4box` (MP4 transmuxing for video streaming). The bundled versions in `vendor/` are already committed, so this step is only needed if you want to update dependencies.

## Updating vendored dependencies

```bash
# file-type (MIME detection)
npm update file-type
npx esbuild --bundle --format=esm --outfile=vendor/file-type.bundle.js node_modules/file-type/core.js

# mp4box (MP4 transmuxing for video streaming)
npm update mp4box
npx esbuild --bundle --format=esm --outfile=vendor/mp4box.bundle.js node_modules/mp4box/dist/mp4box.all.js
```

## Running

Serve the directory with any static file server:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.
