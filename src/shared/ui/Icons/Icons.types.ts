import type { CSSProperties } from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  'aria-hidden'?: boolean;
}

export type IconComponent = (props: IconProps) => React.ReactElement;
