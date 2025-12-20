export interface TextareaProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  showCounter?: boolean;
  autoResize?: boolean;
  rows?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  name?: string;
  id?: string;
  label?: string;
  helperText?: string;
}
