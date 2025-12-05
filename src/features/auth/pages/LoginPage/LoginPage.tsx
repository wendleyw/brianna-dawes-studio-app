import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from '../../components/LoginForm';
import { Skeleton } from '@shared/ui';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
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
