// src/components/ErrorBoundary.jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    try {
      localStorage.removeItem('azeron-keymap-autosave');
    } catch (e) {
      console.warn('Failed to clear saved data:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          color: '#e9efff',
          background: '#0b0d12',
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2 style={{ color: '#ff6b6b', marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ marginBottom: 24, color: '#9aa4c0' }}>
            The app encountered an unexpected error. Your auto-saved data should be preserved.
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, #2b305c, #1a1e41)',
                border: '1px solid rgba(138,107,255,0.35)',
                color: '#e9efff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={this.handleClearAndReload}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, #5c2b2b, #411a1a)',
                border: '1px solid rgba(255,107,107,0.35)',
                color: '#e9efff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              Clear Data & Reload
            </button>
          </div>

          <details style={{ color: '#9aa4c0' }}>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Error Details</summary>
            <pre style={{
              color: '#ff6b6b',
              background: '#1a1a2e',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 12,
              maxHeight: 300
            }}>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
