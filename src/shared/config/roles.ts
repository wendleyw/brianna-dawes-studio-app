export type UserRole = 'admin' | 'designer' | 'client';

export const ROLES = {
  ADMIN: 'admin' as const,
  DESIGNER: 'designer' as const,
  CLIENT: 'client' as const,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  designer: 'Designer',
  client: 'Client',
};

export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManageAllProjects: true,
    canAssignDesigners: true,
    canViewReports: true,
    canApproveDeliverables: true,
    canCreateProjects: true,
    // Miro board permissions
    canSyncAllProjects: true,
    canCreateStages: true,
    canModifyBoardLayout: true,
    canDeleteFromBoard: true,
  },
  designer: {
    canManageUsers: false,
    canManageAllProjects: false,
    canAssignDesigners: false,
    canViewReports: false,
    canApproveDeliverables: false,
    canCreateProjects: false,
    // Miro board permissions
    canSyncAllProjects: false,
    canCreateStages: true,
    canModifyBoardLayout: false,
    canDeleteFromBoard: false,
  },
  client: {
    canManageUsers: false,
    canManageAllProjects: false,
    canAssignDesigners: false,
    canViewReports: false,
    canApproveDeliverables: true,
    canCreateProjects: true,
    // Miro board permissions
    canSyncAllProjects: false,
    canCreateStages: true,
    canModifyBoardLayout: false,
    canDeleteFromBoard: false,
  },
} as const;

export function hasPermission(
  role: UserRole,
  permission: keyof (typeof ROLE_PERMISSIONS)[UserRole]
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Check if a user can access a specific project
 * - Admin: Can access all projects
 * - Designer: Can access projects they're assigned to
 * - Client: Can access projects where they're the client
 */
export function canAccessProject(
  user: { id: string; role: UserRole } | null,
  project: { clientId?: string | null; designerIds?: string[] | null }
): boolean {
  if (!user) return false;

  // Admin can access all projects
  if (user.role === 'admin') return true;

  // Client can access their own projects
  if (user.role === 'client' && project.clientId === user.id) return true;

  // Designer can access projects they're assigned to
  if (user.role === 'designer' && project.designerIds?.includes(user.id)) return true;

  return false;
}
