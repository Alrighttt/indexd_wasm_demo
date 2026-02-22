// Web Worker for WASM download pipeline
// Runs shard decryption, RS reconstruction, and object-level decryption
// off the main thread, posting decrypted chunks back via Transferable ArrayBuffers.

import init, { AppKey, Builder, DownloadOptions, setLogLevel } from './pkg/indexd_wasm.js';

function fromHex(h) {
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substr(i * 2, 2), 16);
  }
  return bytes;
}

self.onmessage = async (e) => {
  const { type } = e.data;

  if (type === 'start') {
    const {
      indexerUrl,
      keyHex,
      maxDownloads,
      objectUrl,
      logLevel,
    } = e.data;

    try {
      // Initialize WASM module
      await init();
      if (logLevel) setLogLevel(logLevel);

      // Build SDK
      const seed = fromHex(keyHex);
      const appKey = new AppKey(seed);
      const builder = new Builder(indexerUrl);

      const sdk = await builder.connected(appKey);
      if (!sdk) {
        self.postMessage({ type: 'error', message: 'SDK connection failed — app key not recognized' });
        return;
      }

      // Get object
      const obj = objectUrl.startsWith('sia://')
        ? await sdk.sharedObject(objectUrl)
        : await sdk.object(objectUrl);

      // Stream download — post chunks back to main thread
      let byteOffset = 0;
      const opts = new DownloadOptions();
      opts.maxInflight = maxDownloads;
      await sdk.downloadStreaming(
        obj,
        opts,
        (chunk) => {
          const buf = chunk.buffer.slice(
            chunk.byteOffset,
            chunk.byteOffset + chunk.byteLength,
          );
          self.postMessage(
            { type: 'chunk', offset: byteOffset, size: chunk.byteLength, data: buf },
            [buf], // Transfer the ArrayBuffer (zero-copy)
          );
          byteOffset += chunk.byteLength;
        },
        (current, total) => {
          self.postMessage({ type: 'progress', current, total });
        },
      );

      self.postMessage({ type: 'complete' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message || String(err) });
    }
  }
};
