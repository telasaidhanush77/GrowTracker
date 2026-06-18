import { registerRootComponent } from 'expo';

import App from './App';

// Inject full-height CSS for React Native Web before React mounts.
// `globalThis` is typed in TS; the `'document' in` guard means this is a no-op on native.
if (typeof globalThis !== 'undefined' && 'document' in globalThis) {
  const doc = (globalThis as any).document as Document;
  if (!doc.getElementById('rnw-root-style')) {
    const s = doc.createElement('style');
    s.id = 'rnw-root-style';
    s.textContent =
      'html,body{height:100%;margin:0;padding:0;background:#0F172A}' +
      '#root{height:100%;display:flex;flex-direction:column}';
    doc.head.appendChild(s);
  }
}

registerRootComponent(App);
