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

// Session key to track if animation has been shown
const ANIMATION_SHOWN_KEY = 'logo_animation_shown';

export function Logo({ size = 'md', className, animated = false, onAnimationComplete }: LogoProps) {
  const dimension = SIZES[size];
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if animation was already shown this session
  const getAlreadyShown = () => {
    try {
      return sessionStorage.getItem(ANIMATION_SHOWN_KEY) === 'true';
    } catch {
      // sessionStorage might not be available in iframe
      return false;
    }
  };

  const [showAnimation, setShowAnimation] = useState(() => {
    const shouldAnimate = animated && !getAlreadyShown();
    console.log('[Logo] Initial state:', { animated, alreadyShown: getAlreadyShown(), shouldAnimate });
    return shouldAnimate;
  });
  const [fadeOut, setFadeOut] = useState(false);

  const handleVideoEnd = useCallback(() => {
    console.log('[Logo] Video ended naturally');
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

    console.log('[Logo] Animation starting...');

    // Mark as shown for this session
    try {
      sessionStorage.setItem(ANIMATION_SHOWN_KEY, 'true');
    } catch {
      // Ignore if sessionStorage not available
    }

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
