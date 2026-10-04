import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Installable PWA: register the service worker so the kiosk display works
// offline. Guarded for browsers (old iPads) without service worker support.
if ((import.meta as { env?: { PROD?: boolean } }).env?.PROD &&
    'serviceWorker' in navigator &&
    window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline caching is a bonus, never a blocker */
    });
  });
}
