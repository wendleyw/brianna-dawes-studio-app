export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'border' | 'dots' | 'bars';
export type SpinnerColor = 'primary' | 'white' | 'current';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  color?: SpinnerColor;
  label?: string;
  className?: string;
}
