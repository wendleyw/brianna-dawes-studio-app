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
    color: '#7C3AED',    // Purple
    bgColor: '#EDE9FE',  // Light purple
  },
  designer: {
    label: 'Designer',
    color: '#0891B2',    // Cyan
    bgColor: '#CFFAFE',  // Light cyan
  },
  client: {
    label: 'Client',
    color: '#D97706',    // Amber
    bgColor: '#FEF3C7',  // Light amber
  },
};

/** Role colors only (for components that just need colors) */
export const ROLE_COLORS: Record<UserRole, { color: string; bg: string }> = {
  admin: { color: '#7C3AED', bg: '#EDE9FE' },
  designer: { color: '#0891B2', bg: '#CFFAFE' },
  client: { color: '#D97706', bg: '#FEF3C7' },
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
