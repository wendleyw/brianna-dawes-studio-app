import { useState, useEffect, useRef } from 'react';
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
  const alreadyShown = sessionStorage.getItem(ANIMATION_SHOWN_KEY) === 'true';
  const [showAnimation, setShowAnimation] = useState(animated && !alreadyShown);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!showAnimation) return;

    // Mark as shown for this session
    sessionStorage.setItem(ANIMATION_SHOWN_KEY, 'true');

    // Play video
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // If video fails to play, show static immediately
        setShowAnimation(false);
        onAnimationComplete?.();
      });
    }

    // Animation duration is ~4 seconds, start fade at 3.7s
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3700);

    // Switch to static logo after 4s
    const switchTimer = setTimeout(() => {
      setShowAnimation(false);
      onAnimationComplete?.();
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(switchTimer);
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
