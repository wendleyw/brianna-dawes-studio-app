import type { DeliverableVersion } from '../../domain/deliverable.types';

export interface VersionHistoryProps {
  deliverableId: string;
  currentVersionId?: string | null;
  onVersionSelect?: (version: DeliverableVersion) => void;
}
