export interface DeliverableUploadProps {
  deliverableId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}
