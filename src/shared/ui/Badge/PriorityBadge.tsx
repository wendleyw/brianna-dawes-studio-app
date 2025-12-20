import React from 'react';
import { Badge } from './Badge';

type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: ProjectPriority;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const PRIORITY_CONFIG: Record<
  ProjectPriority,
  {
    color: 'error' | 'warning' | 'primary' | 'success';
    label: string;
  }
> = {
  urgent: { color: 'error', label: 'Urgent' },
  high: { color: 'warning', label: 'High' },
  medium: { color: 'primary', label: 'Medium' },
  low: { color: 'success', label: 'Low' },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const config = PRIORITY_CONFIG[priority];

  return (
    <Badge variant="soft" color={config.color} size={size}>
      {config.label}
    </Badge>
  );
};
