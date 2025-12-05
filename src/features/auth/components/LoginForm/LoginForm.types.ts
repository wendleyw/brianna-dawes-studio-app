export interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}
