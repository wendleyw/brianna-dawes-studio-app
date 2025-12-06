import { useState, useEffect, useRef } from 'react';
import styles from './LogoSplash.module.css';

interface LogoSplashProps {
  /** Duration to show the animation in milliseconds (default: 4000) */
  duration?: number;
  /** Callback when splash is complete */
  onComplete?: () => void;
  /** Static logo to show after animation */
  staticLogoSrc: string;
  /** Size of the logo */
  size?: number;
}

export function LogoSplash({
  duration = 4000,
  onComplete,
  staticLogoSrc,
  size = 60
}: LogoSplashProps) {
  const [showStatic, setShowStatic] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Start fade out slightly before duration ends for smooth transition
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration - 300);

    // Switch to static logo after duration
    const switchTimer = setTimeout(() => {
      setShowStatic(true);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(switchTimer);
    };
  }, [duration, onComplete]);

  // Try to play video on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // If video fails to play, show static immediately
        setShowStatic(true);
        onComplete?.();
      });
    }
  }, [onComplete]);

  if (showStatic) {
    return (
      <div className={styles.container}>
        <img
          src={staticLogoSrc}
          alt="Brianna Dawes Studios"
          width={size}
          height={size}
          className={styles.staticLogo}
          style={{ objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${fadeOut ? styles.fadeOut : ''}`}>
      <video
        ref={videoRef}
        className={styles.video}
        width={size}
        height={size}
        muted
        playsInline
        autoPlay
      >
        <source src="/logo-animation.MOV" type="video/quicktime" />
        <source src="/logo-animation.MOV" type="video/mp4" />
        {/* Fallback to static if video not supported */}
        <img
          src={staticLogoSrc}
          alt="Brianna Dawes Studios"
          width={size}
          height={size}
        />
      </video>
    </div>
  );
}

LogoSplash.displayName = 'LogoSplash';
