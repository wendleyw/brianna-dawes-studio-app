import type { LogoProps } from './Logo.types';
import logoImage from '../../../assets/brand/logo-brianna.png';

const SIZES = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 60,
};

export function Logo({ size = 'md', className }: LogoProps) {
  const dimension = SIZES[size];

  return (
    <img
      src={logoImage}
      alt="Brianna Dawes Studios"
      width={dimension}
      height={dimension}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

Logo.displayName = 'Logo';
