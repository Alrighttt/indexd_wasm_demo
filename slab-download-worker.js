// Web Worker for parallel slab downloads.
// Each worker creates its own SDK instance and downloads individual slabs
// on demand. A pool of these workers enables true parallel slab downloads.

import init, { AppKey, Builder } from './pkg/indexd_wasm.js';

function fromHex(h) {
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substr(i * 2, 2), 16);
  }
  return bytes;
}

let sdk = null;
let obj = null;

self.onmessage = async (e) => {
  const { type } = e.data;

  if (type === 'init') {
    const {
      indexerUrl,
      keyHex,
      maxPriceFetches,
      maxDownloads,
      maxUploads,
      objectUrl,
    } = e.data;

    try {
      await init();

      const seed = fromHex(keyHex);
      const appKey = new AppKey(seed);
      const builder = new Builder(indexerUrl);
      builder.withMaxPriceFetches(maxPriceFetches);
      builder.withMaxDownloads(maxDownloads);
      builder.withMaxUploads(maxUploads);

      sdk = await builder.connected(appKey);
      if (!sdk) {
        self.postMessage({ type: 'error', message: 'SDK connection failed — app key not recognized' });
        return;
      }

      obj = objectUrl.startsWith('sia://')
        ? await sdk.sharedObject(objectUrl)
        : await sdk.object(objectUrl);

      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message || String(err) });
    }
    return;
  }

  if (type === 'download-slab') {
    const { slabIndex } = e.data;
    try {
      const data = await sdk.downloadSlabByIndex(obj, slabIndex);
      const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      self.postMessage(
        { type: 'slab-data', slabIndex, data: buf },
        [buf], // Transferable — zero-copy to main thread
      );
    } catch (err) {
      self.postMessage({ type: 'slab-error', slabIndex, message: err.message || String(err) });
    }
    return;
  }
};
