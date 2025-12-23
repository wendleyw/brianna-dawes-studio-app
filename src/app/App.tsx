import { useState } from 'react';
import { Providers } from './Providers';
import { Router } from './Router';
import { SplashScreen } from '@shared/ui';
import logoImage from '../assets/brand/logo-brianna.png';

const appStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setShowContent(true);
  };

  return (
    <>
      {showSplash && (
        <SplashScreen
          videoSrc="/logo-animation.webm"
          staticLogoSrc={logoImage}
          displayDuration={1500}
          animationDuration={600}
          onComplete={handleSplashComplete}
          brandText="BRIANNA DAWES STUDIOS"
        />
      )}
      {showContent && (
        <Providers>
          <div style={appStyles}>
            <Router />
          </div>
        </Providers>
      )}
    </>
  );
}
