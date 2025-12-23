import { useEffect, useRef, useCallback } from 'react';
import type { LogoProps } from './Logo.types';
import { createLogger } from '@shared/lib/logger';
import logoImage from '../../../assets/brand/logo-brianna.png';
import styles from './Logo.module.css';

const logger = createLogger('Logo');

const SIZES = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 60,
};

export function Logo({ size = 'md', className, animated = false, onAnimationComplete }: LogoProps) {
  const dimension = SIZES[size];
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnd = useCallback(() => {
    logger.debug('Video ended - staying on last frame');
    // Video stays on last frame (no switch to static image)
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  const handleVideoError = useCallback(() => {
    logger.debug('Video error');
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!animated) return;

    // Fallback timer in case video doesn't end properly
    const fallbackTimer = setTimeout(() => {
      logger.debug('Fallback timer triggered');
      onAnimationComplete?.();
    }, 5000); // 5s fallback

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [animated, onAnimationComplete]);

  // Show animated video logo (plays once and stays on last frame)
  if (animated) {
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <video
          ref={videoRef}
          className={styles.video}
          width={dimension}
          height={dimension}
          muted
          playsInline
          autoPlay
          onEnded={handleVideoEnd}
          onError={handleVideoError}
        >
          <source src="/logo-animation.webm" type="video/webm" />
        </video>
      </div>
    );
  }

  // Show static logo (when animated=false)
  return (
    <img
      src={logoImage}
      alt="Brianna Dawes Studios"
      width={dimension}
      height={dimension}
      className={`${styles.staticLogo} ${className || ''}`}
      style={{ objectFit: 'contain' }}
    />
  );
}

Logo.displayName = 'Logo';
