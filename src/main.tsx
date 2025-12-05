/**
 * Main entry point for Miro App
 * This script handles the headless initialization and icon click
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { createLogger } from '@shared/lib/logger';
import '@shared/ui/styles/global.css';

const logger = createLogger('Main');

// Miro types are declared in MiroContext.tsx

// Wait for Miro SDK to be available (injected by Miro)
function waitForMiro(timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if already available
    if (typeof window.miro !== 'undefined') {
      resolve(true);
      return;
    }

    // Wait for SDK injection
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (typeof window.miro !== 'undefined') {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

async function init() {
  // Check if running in iframe (likely Miro context)
  const isInIframe = window.self !== window.top;

  if (isInIframe) {
    logger.debug('Running in iframe, waiting for Miro SDK...');

    const miroAvailable = await waitForMiro();

    if (miroAvailable) {
      logger.debug('Miro SDK available, setting up icon click handler...');

      try {
        // Register icon click handler to open panel
        window.miro.board.ui.on('icon:click', async () => {
          logger.debug('Icon clicked, opening panel...');
          await window.miro.board.ui.openPanel({
            url: 'app.html',
            height: 600,
          });
        });

        logger.info('Miro icon click handler registered successfully');
      } catch (error) {
        logger.error('Error setting up Miro', error);
        // Fallback to rendering app if Miro setup fails
        renderApp();
      }
    } else {
      logger.debug('Miro SDK not available, rendering standalone app...');
      renderApp();
    }
  } else {
    logger.debug('Running standalone (not in iframe), rendering React app...');
    renderApp();
  }
}

function renderApp() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}

init();
