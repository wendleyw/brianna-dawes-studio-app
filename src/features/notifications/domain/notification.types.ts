export type NotificationType =
  | 'deliverable_created'
  | 'version_uploaded'
  | 'feedback_received'
  | 'status_changed'
  | 'deadline_approaching'
  | 'project_assigned'
  | 'mention';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: {
    projectId?: string;
    projectName?: string;
    deliverableId?: string;
    deliverableName?: string;
    actorId?: string;
    actorName?: string;
  };
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    [key in NotificationType]: boolean;
  };
}
