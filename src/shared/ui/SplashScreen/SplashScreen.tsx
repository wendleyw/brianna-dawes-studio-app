import { useState, useEffect, useRef, useCallback } from 'react';
import { createLogger } from '@shared/lib/logger';
import styles from './SplashScreen.module.css';

const logger = createLogger('SplashScreen');

interface SplashScreenProps {
  /** Duration to show centered before animation starts (default: 1500ms) */
  displayDuration?: number;
  /** Duration of the slide animation (default: 600ms) */
  animationDuration?: number;
  /** Callback when splash is complete and content should be shown */
  onComplete?: () => void;
  /** Video source for logo animation */
  videoSrc?: string;
  /** Static logo image source */
  staticLogoSrc: string;
  /** Text to show under logo */
  brandText?: string;
}

export function SplashScreen({
  displayDuration = 1500,
  animationDuration = 600,
  onComplete,
  videoSrc = '/logo-animation.MOV',
  staticLogoSrc,
  brandText = 'BRIANNA DAWES STUDIOS',
}: SplashScreenProps) {
  const [phase, setPhase] = useState<'centered' | 'sliding' | 'complete'>('centered');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCalledComplete = useRef(false);

  // Start slide animation after display duration
  useEffect(() => {
    const slideTimer = setTimeout(() => {
      setPhase('sliding');
    }, displayDuration);

    return () => clearTimeout(slideTimer);
  }, [displayDuration]);

  // Complete after slide animation
  useEffect(() => {
    if (phase === 'sliding') {
      const completeTimer = setTimeout(() => {
        setPhase('complete');
        if (!hasCalledComplete.current) {
          hasCalledComplete.current = true;
          onComplete?.();
        }
      }, animationDuration);

      return () => clearTimeout(completeTimer);
    }
  }, [phase, animationDuration, onComplete]);

  // Try to play video on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Video failed to play, continue anyway
        logger.debug('Video play failed, continuing with static');
      });
    }
  }, []);

  // Calculate animation variables for CSS
  const getContainerClass = useCallback(() => {
    switch (phase) {
      case 'centered':
        return styles.container;
      case 'sliding':
        return `${styles.container} ${styles.sliding}`;
      case 'complete':
        return `${styles.container} ${styles.complete}`;
      default:
        return styles.container;
    }
  }, [phase]);

  if (phase === 'complete') {
    return null;
  }

  return (
    <div
      className={getContainerClass()}
      style={{
        '--animation-duration': `${animationDuration}ms`,
      } as React.CSSProperties}
    >
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div className={styles.logoWrapper}>
          <video
            ref={videoRef}
            className={styles.video}
            muted
            playsInline
            autoPlay
            loop={false}
          >
            <source src={videoSrc} type="video/webm" />
            <source src={videoSrc} type="video/mp4" />
            <img
              src={staticLogoSrc}
              alt="Logo"
              className={styles.staticLogo}
            />
          </video>
        </div>
        <h1 className={styles.brandText}>{brandText}</h1>
      </div>
    </div>
  );
}

SplashScreen.displayName = 'SplashScreen';
