import React from 'react';
import App from './App';

class RootErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {error: Error | null}
> {
  state: {error: Error | null} = {error: null};

  static getDerivedStateFromError(error: Error) {
    return {error};
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#17132a',
            color: '#f3ece1',
            fontFamily: 'system-ui, sans-serif',
            padding: 24,
            textAlign: 'center',
          }}>
          <h2 style={{color: '#f2d388', marginBottom: 8}}>Astral Terraces</h2>
          <p style={{color: '#b4a7db', maxWidth: 420, fontSize: 14}}>
            Unable to initialize 3D view ({this.state.error.message}). Please
            enable WebGL or reload the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BootstrapRoot() {
  return (
    <RootErrorBoundary>
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}>
        <App />
      </div>
    </RootErrorBoundary>
  );
}
