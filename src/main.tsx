import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@/theme/base.css';
import { App } from './App';
import { ArchiveProvider } from '@/state/ArchiveContext';
import { UiProvider } from '@/state/UiContext';
import { LockProvider } from '@/state/LockContext';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento raiz não encontrado.');

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <UiProvider>
        <ArchiveProvider>
          <LockProvider>
            <App />
          </LockProvider>
        </ArchiveProvider>
      </UiProvider>
    </HashRouter>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* o aplicativo funciona sem o service worker */
    });
  });
}
