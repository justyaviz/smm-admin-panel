import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './premium.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'ALOOSMM_NAVIGATE' && event.data.url) {
      const target = new URL(event.data.url, window.location.origin);
      window.location.assign(`${target.pathname}${target.search}${target.hash}`);
    }
  });
}
