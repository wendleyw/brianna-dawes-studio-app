/**
 * Role Configuration
 *
 * Centralized configuration for user roles (Admin, Designer, Client).
 * Use these constants for consistent styling across the app.
 */

import type { UserRole } from './roles';

export interface RoleConfig {
  label: string;
  color: string;
  bgColor: string;
}

/** Role colors and labels for UI rendering */
export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  admin: {
    label: 'Admin',
    color: 'var(--color-purple-600)',    // Purple
    bgColor: 'var(--color-purple-500)',  // Light purple
  },
  designer: {
    label: 'Designer',
    color: 'var(--color-accent)',    // Cyan
    bgColor: 'var(--color-info-light)',  // Light cyan
  },
  client: {
    label: 'Client',
    color: 'var(--color-warning-dark)',    // Amber
    bgColor: 'var(--color-warning-light)',  // Light amber
  },
};

/** Role colors only (for components that just need colors) */
export const ROLE_COLORS: Record<UserRole, { color: string; bg: string }> = {
  admin: { color: 'var(--color-purple-600)', bg: 'var(--color-purple-500)' },
  designer: { color: 'var(--color-accent)', bg: 'var(--color-info-light)' },
  client: { color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)' },
};

/** Get role configuration by role */
export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIG[role];
}

/** Get role color by role */
export function getRoleColor(role: UserRole): string {
  return ROLE_CONFIG[role].color;
}

/** Get role background color by role */
export function getRoleBgColor(role: UserRole): string {
  return ROLE_CONFIG[role].bgColor;
}

/** Get role label by role */
export function getRoleLabel(role: UserRole): string {
  return ROLE_CONFIG[role].label;
}
