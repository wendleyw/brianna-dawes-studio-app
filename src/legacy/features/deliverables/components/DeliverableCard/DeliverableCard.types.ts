import type { Deliverable } from '../../domain/deliverable.types';

export interface DeliverableCardProps {
  deliverable: Deliverable;
  onView?: (deliverable: Deliverable) => void;
  onUpload?: (deliverable: Deliverable) => void;
}
