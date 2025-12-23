import React from 'react';
import { Badge } from './Badge';
import { CheckCircleIcon, ClockIcon, AlertCircleIcon } from '@shared/ui/Icons';

type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'done' | 'archived';

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    color: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
    icon: React.ReactNode;
    label: string;
  }
> = {
  draft: {
    color: 'neutral',
    icon: <ClockIcon size={14} />,
    label: 'Draft',
  },
  in_progress: {
    color: 'primary',
    icon: <ClockIcon size={14} />,
    label: 'In Progress',
  },
  review: {
    color: 'review',
    icon: <AlertCircleIcon size={14} />,
    label: 'In Review',
  },
  done: {
    color: 'success',
    icon: <CheckCircleIcon size={14} />,
    label: 'Done',
  },
  archived: {
    color: 'neutral',
    icon: null,
    label: 'Archived',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="soft" color={config.color} leftIcon={config.icon} size={size}>
      {config.label}
    </Badge>
  );
};
