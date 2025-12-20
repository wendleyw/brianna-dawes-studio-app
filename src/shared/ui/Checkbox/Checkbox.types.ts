import { ReactNode } from 'react';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  error?: boolean;
  label?: ReactNode;
  labelPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  name?: string;
  id?: string;
}
