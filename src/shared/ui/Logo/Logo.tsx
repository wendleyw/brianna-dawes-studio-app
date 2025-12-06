import { useState, useEffect, useRef, useCallback } from 'react';
import type { LogoProps } from './Logo.types';
import logoImage from '../../../assets/brand/logo-brianna.png';
import styles from './Logo.module.css';

const SIZES = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 60,
};

export function Logo({ size = 'md', className, animated = false, onAnimationComplete }: LogoProps) {
  const dimension = SIZES[size];
  const videoRef = useRef<HTMLVideoElement>(null);

  // Always show animation when animated=true (every time app opens)
  const [showAnimation, setShowAnimation] = useState(animated);
  const [fadeOut, setFadeOut] = useState(false);

  const handleVideoEnd = useCallback(() => {
    console.log('[Logo] Video ended');
    setFadeOut(true);
    setTimeout(() => {
      setShowAnimation(false);
      onAnimationComplete?.();
    }, 300);
  }, [onAnimationComplete]);

  const handleVideoError = useCallback(() => {
    console.log('[Logo] Video error - showing static');
    setShowAnimation(false);
    onAnimationComplete?.();
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!showAnimation) return;

    // Fallback timer in case video doesn't end properly
    const fallbackTimer = setTimeout(() => {
      console.log('[Logo] Fallback timer triggered');
      setFadeOut(true);
      setTimeout(() => {
        setShowAnimation(false);
        onAnimationComplete?.();
      }, 300);
    }, 5000); // 5s fallback

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [showAnimation, onAnimationComplete]);

  // Show animated logo
  if (showAnimation) {
    return (
      <div className={`${styles.container} ${fadeOut ? styles.fadeOut : ''} ${className || ''}`}>
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

  // Show static logo
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
