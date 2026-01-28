/**
 * Date Formatting - Single source of truth for date display across the app
 *
 * Ensures consistent date format in all components:
 * - ProjectCard
 * - Dashboard
 * - Activity Feed
 * - Notifications
 * - etc.
 */

/**
 * Format date as short (Dec 6)
 * Used in: cards, lists, compact views
 */
export function formatDateShort(dateString: string | Date | null): string {
  if (!dateString) return '—';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date as full (Dec 6, 2025)
 * Used in: detail pages, forms
 */
export function formatDateFull(dateString: string | Date | null): string {
  if (!dateString) return '—';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format date as month only (DEC)
 * Used in: charts, timelines
 */
export function formatDateMonth(dateString: string | Date | null): string {
  if (!dateString) return '—';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

/**
 * Format date as month with year (DEC 2025)
 * Used in: timeline headers where year context is important
 */
export function formatDateMonthYear(dateString: string | Date | null): string {
  if (!dateString) return '—';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();

  // Only show year if different from current year
  if (year !== currentYear) {
    return `${month} ${year}`;
  }
  return month;
}

/**
 * Format date with time (Dec 6, 2025 at 3:45 PM)
 * Used in: activity feed, notifications, audit logs
 */
export function formatDateTime(dateString: string | Date | null): string {
  if (!dateString) return '—';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format relative time (2 hours ago, yesterday, etc.)
 * Used in: activity feed, notifications
 */
export function formatRelativeTime(dateString: string | Date | null): string {
  if (!dateString) return '—';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  // Fallback to short date for older dates
  return formatDateShort(date);
}

/**
 * Format date for HTML input (YYYY-MM-DD)
 * Used in: form date inputs
 */
export function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate days remaining or overdue
 * Used in: ProjectCard, status indicators
 */
export function getDaysRemaining(dateString: string | Date | null): {
  days: number;
  text: string;
  isOverdue: boolean;
} | null {
  if (!dateString) return null;

  const due = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return { days: Math.abs(diff), text: `${Math.abs(diff)} days overdue`, isOverdue: true };
  }
  if (diff === 0) {
    return { days: 0, text: 'Due today', isOverdue: false };
  }
  return { days: diff, text: `${diff} days left`, isOverdue: false };
}

/**
 * Calculate days saved (completed early) for Done projects.
 * Returns positive number if completed before due date, null otherwise.
 * Used in: ProjectCard, Miro timeline, briefing frame
 */
export function getDaysEarly(
  dueDate: string | Date | null,
  completedAt: string | Date | null
): { days: number; text: string } | null {
  if (!dueDate || !completedAt) return null;

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const completed = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;

  // Compare dates only (ignore time)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const completedDay = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());

  const diffMs = dueDay.getTime() - completedDay.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days <= 0) return null;

  return {
    days,
    text: `${days} day${days === 1 ? '' : 's'} early`,
  };
}
