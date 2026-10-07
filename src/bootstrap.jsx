import React from 'react';
import { labels } from './ui-copy.mjs';
import { createRoot } from 'react-dom/client';
import { ContentClient, browserStore } from './content-client.mjs';
import { ProductApp } from './ProductApp';
import { NativeGraph } from './NativeGraph';

const root = document.getElementById('root');
let bootstrapRoot = createRoot(root);
window.NutugShellReady =
  location.protocol === 'file:'
    ? Promise.resolve(true)
    : navigator.serviceWorker
      ? navigator.serviceWorker
          .register(new URL('./sw.js', location.href))
          .then(() => navigator.serviceWorker.ready)
          .then(() => true)
          .catch(() => false)
      : Promise.resolve(false);
const manifestUrl = window.NutugContentManifest || __NUTUG_CONTENT_MANIFEST__;
async function start() {
  bootstrapRoot.render(
    <div className="bootstrap-screen">
      <span className="mn">{labels.brand}</span>
      <span className="bootstrap-spinner" role="status" aria-label={labels.brand} />
    </div>,
  );
  try {
    const client = new ContentClient({ manifestUrl, store: await browserStore() });
    const data = await client.load();
    window.NutugData = data;
    window.NutugContentClient = client;
    bootstrapRoot.unmount();
    bootstrapRoot = null;
    await import('./main.jsx');
    client.start();
  } catch (error) {
    console.error('Application loading failed', error);
    const retry = bootstrapRoot ? start : () => location.reload();
    bootstrapRoot ||= createRoot(root);
    bootstrapRoot.render(
      <div className="bootstrap-screen">
        <span className="mn">{labels.brand}</span>
        <button className="text-button" onClick={retry}>
          <span className="mn">{labels.retry}</span>
        </button>
      </div>,
    );
  }
}
const legacy =
  /tribes|almanac/.test(location.pathname) || /^#(knowledge|article=|person=)/.test(location.hash);
if (window.NutugGraph) bootstrapRoot.render(<NativeGraph />);
else if (legacy) start();
else bootstrapRoot.render(<ProductApp manifestUrl={manifestUrl} />);
