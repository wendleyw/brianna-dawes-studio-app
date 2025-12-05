import type { UserRole } from '@config/roles';

export interface AccessDeniedProps {
  userRole: UserRole;
  requiredRoles: UserRole[];
}
