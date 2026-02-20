// Web Worker for parallel slab uploads.
// Each worker creates its own SDK instance and uploads individual slabs
// on demand. A pool of these workers enables true parallel slab uploads.

import init, { AppKey, Builder } from './pkg/indexd_wasm.js';

function fromHex(h) {
  const bytes = new Uint8Array(h.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(h.substr(i * 2, 2), 16);
  }
  return bytes;
}

let sdk = null;

self.onmessage = async (e) => {
  const { type } = e.data;

  if (type === 'init') {
    const {
      indexerUrl,
      keyHex,
      maxPriceFetches,
      maxUploads,
      workerIndex,
      numWorkers,
    } = e.data;

    try {
      await init();

      const seed = fromHex(keyHex);
      const appKey = new AppKey(seed);
      const builder = new Builder(indexerUrl);
      builder.withMaxPriceFetches(maxPriceFetches);
      builder.withMaxUploads(maxUploads);
      // Downloads not needed for upload workers
      builder.withMaxDownloads(1);

      sdk = await builder.connected(appKey);
      if (!sdk) {
        self.postMessage({ type: 'error', message: 'SDK connection failed — app key not recognized' });
        return;
      }

      // Tell the SDK which worker this is so it can evenly space
      // host selection across all workers based on actual host count.
      sdk.setUploadWorker(workerIndex, numWorkers);

      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message || String(err) });
    }
    return;
  }

  if (type === 'upload-slab') {
    const { slabIndex, data, dataKey, streamOffset } = e.data;
    try {
      const dataKeyBytes = new Uint8Array(dataKey);
      const slabData = new Uint8Array(data);

      const slabJson = await sdk.uploadSlab(
        slabData,
        dataKeyBytes,
        streamOffset,
        (current, total) => {
          self.postMessage({ type: 'shard-progress', slabIndex, current, total });
        },
      );

      self.postMessage({ type: 'slab-uploaded', slabIndex, slabJson });
    } catch (err) {
      self.postMessage({ type: 'slab-error', slabIndex, message: err.message || String(err) });
    }
    return;
  }
};
