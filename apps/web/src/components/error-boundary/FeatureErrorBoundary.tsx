"use client";

import { Component, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log feature-specific error
    console.error(`Error in ${this.props.featureName} feature:`, error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, featureName } = this.props;

    if (hasError && error) {
      return fallback || (
        <ErrorFallback
          error={error}
          resetError={this.resetError}
          level="feature"
          errorId={`${featureName}_${Date.now()}`}
        />
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withFeatureErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  featureName: string,
  onError?: (error: Error, errorInfo: any) => void
) {
  const WrappedComponent = (props: P) => (
    <FeatureErrorBoundary featureName={featureName} onError={onError}>
      <Component {...props} />
    </FeatureErrorBoundary>
  );

  WrappedComponent.displayName = `withFeatureErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
