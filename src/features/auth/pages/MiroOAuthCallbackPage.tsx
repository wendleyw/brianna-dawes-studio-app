import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { miroOAuthService } from '../services/miroOAuthService';
import styles from './MiroOAuthCallbackPage.module.css';

export function MiroOAuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing OAuth parameters from Miro.');
      return;
    }

    const run = async () => {
      try {
        await miroOAuthService.complete(code, state);
        setStatus('success');
        setMessage('Miro connection saved. Redirecting...');
        setTimeout(() => navigate('/admin?tab=analytics'), 1500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to finish Miro OAuth.';
        setStatus('error');
        setMessage(msg);
      }
    };

    run();
  }, [navigate]);

  return (
    <div className={styles.container}>
      <h1>Miro OAuth</h1>
      {status === 'pending' && <p>Saving connection...</p>}
      {status === 'success' && <p className={styles.success}>{message}</p>}
      {status === 'error' && <p className={styles.error}>{message}</p>}
    </div>
  );
}
