import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from '../../components/LoginForm';
import { Skeleton } from '@shared/ui';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  // Track if we've shown the login form at least once
  // This prevents unmounting during auth which would reset the ref
  const [hasShownForm, setHasShownForm] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setHasShownForm(true);
    }
  }, [isLoading, isAuthenticated]);

  // Only show skeleton on initial load, not during auth
  if (isLoading && !hasShownForm) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Skeleton height={400} />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <LoginForm />

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Brianna Dawes Studio &copy; {new Date().getFullYear()}
            {' · '}
            <a
              href="https://miro.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              Powered by Miro
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
