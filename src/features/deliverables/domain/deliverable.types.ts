export type DeliverableStatus = 'draft' | 'in_progress' | 'in_review' | 'approved' | 'rejected' | 'delivered';
export type DeliverableType = 'concept' | 'design' | 'revision' | 'final' | 'image' | 'video' | 'document' | 'archive' | 'other';

export interface DeliverableVersion {
  id: string;
  deliverableId: string;
  versionNumber: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  comment: string | null;
  createdAt: string;
}

export interface DeliverableFeedback {
  id: string;
  deliverableId: string;
  versionId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
  };
  content: string;
  status: 'pending' | 'resolved';
  miroAnnotationId: string | null;
  position: { x: number; y: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  type: DeliverableType;
  status: DeliverableStatus;
  currentVersionId: string | null;
  currentVersion: DeliverableVersion | null;
  versionsCount: number;
  feedbackCount: number;
  miroFrameId: string | null;
  miroUrl: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  count: number;
  bonusCount: number;
  hoursSpent: number | null;
  notes: string | null;
  dueDate: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliverableInput {
  projectId: string;
  name: string;
  description?: string | null;
  type?: DeliverableType;
  status?: DeliverableStatus;
  count?: number;
  bonusCount?: number;
  hoursSpent?: number | null;
  notes?: string | null;
  externalUrl?: string | null;
  miroUrl?: string | null;
  miroFrameId?: string | null;
  dueDate?: string | null;
}

export interface UpdateDeliverableInput {
  name?: string;
  description?: string | null;
  type?: DeliverableType;
  status?: DeliverableStatus;
  count?: number;
  bonusCount?: number;
  hoursSpent?: number | null;
  notes?: string | null;
  externalUrl?: string | null;
  miroUrl?: string | null;
  miroFrameId?: string | null;
  dueDate?: string | null;
}

export interface UploadVersionInput {
  deliverableId: string;
  file: File;
  comment?: string;
}

export interface DeliverableFilters {
  projectId?: string;
  status?: DeliverableStatus | DeliverableStatus[];
  type?: DeliverableType | DeliverableType[];
  search?: string;
}

export interface DeliverableSort {
  field: 'name' | 'createdAt' | 'updatedAt' | 'dueDate' | 'status';
  direction: 'asc' | 'desc';
}

export interface DeliverablesQueryParams {
  filters?: DeliverableFilters;
  sort?: DeliverableSort;
  page?: number;
  pageSize?: number;
}

export interface DeliverablesResponse {
  data: Deliverable[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
