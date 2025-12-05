export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LogoProps {
  /** Size of the logo */
  size?: LogoSize;
  /** Additional class name */
  className?: string;
}
