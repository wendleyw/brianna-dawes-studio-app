import { Providers } from './Providers';
import { Router } from './Router';

const appStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

export function App() {
  return (
    <Providers>
      <div style={appStyles}>
        <Router />
      </div>
    </Providers>
  );
}
