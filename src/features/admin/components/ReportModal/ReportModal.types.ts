export interface ReportModalProps {
  open: boolean;
  onClose: () => void;
}

export interface ReportFilters {
  clientId: string;
  year: number;
  month: number | null; // null = all months
  statusFilter: string[];
}

export interface ClientOption {
  id: string;
  name: string;
  email: string;
}
