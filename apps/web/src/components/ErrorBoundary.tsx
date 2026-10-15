'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#EF4444', marginRight: '0.5rem' }} />
            Une erreur est survenue
          </h2>
          <p style={{ color: '#888', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'Erreur inattendue'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
