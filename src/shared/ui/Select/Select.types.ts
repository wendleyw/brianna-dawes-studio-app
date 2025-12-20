import { ReactNode } from 'react';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T = string> {
  value?: T | T[];
  onChange: (value: T | T[]) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  renderOption?: (option: SelectOption<T>) => ReactNode;
  size?: 'sm' | 'md' | 'lg';
  name?: string;
  id?: string;
  label?: string;
}
