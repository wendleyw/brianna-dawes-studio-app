import { ReactNode } from 'react';

export interface RadioOption<T = string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T = string> {
  value?: T;
  defaultValue?: T;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  name: string;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  error?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface RadioProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  label?: ReactNode;
  value: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}
