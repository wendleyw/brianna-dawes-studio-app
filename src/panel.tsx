/**
 * Panel entry point for Miro App
 * This is loaded when the panel is opened from the icon click
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@app/App';
import { createLogger } from '@shared/lib/logger';
import '@shared/ui/styles/global.css';

const logger = createLogger('Panel');

// Initialize the panel
async function initPanel() {
  logger.info('Initializing Miro panel...');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    logger.error('Root element not found');
    return;
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  logger.info('Panel initialized successfully');
}

initPanel();
