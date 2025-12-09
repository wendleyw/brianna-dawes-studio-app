export interface ReportModalProps {
  open: boolean;
  onClose: () => void;
}

export interface ReportFilters {
  clientId: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  statusFilter: string[];
}

export interface ClientOption {
  id: string;
  name: string;
  email: string;
}
