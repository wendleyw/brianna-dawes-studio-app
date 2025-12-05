import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/ui';
import { ROLE_LABELS } from '@shared/config/roles';
import type { AccessDeniedProps } from './AccessDenied.types';
import styles from './AccessDenied.module.css';

export function AccessDenied({ userRole, requiredRoles }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <svg
        className={styles.icon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>

      <h1 className={styles.title}>Acesso Negado</h1>
      <p className={styles.description}>
        Você não tem permissão para acessar esta página. Entre em contato com o
        administrador se acredita que isso é um erro.
      </p>

      <div className={styles.roleInfo}>
        <div className={styles.roleRow}>
          <span className={styles.roleLabel}>Seu perfil:</span>
          <span className={styles.roleValue}>{ROLE_LABELS[userRole]}</span>
        </div>
        <div className={styles.roleRow}>
          <span className={styles.roleLabel}>Perfis necessários:</span>
          <span className={styles.roleValue}>
            {requiredRoles.map((role) => ROLE_LABELS[role]).join(', ')}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Button variant="primary" onClick={() => navigate('/')}>
          Ir para Home
        </Button>
      </div>
    </div>
  );
}
