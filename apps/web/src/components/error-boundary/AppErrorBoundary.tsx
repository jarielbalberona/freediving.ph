"use client";

import { Component, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';
import { reportPageError } from '@/lib/error-reporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `app_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Report the error
    reportPageError(error, {
      errorId: this.state.errorId,
      level: 'page',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'AppErrorBoundary',
      },
    });

    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
    });
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children } = this.props;

    if (hasError && error) {
      return (
        <ErrorFallback
          error={error}
          resetError={this.resetError}
          level="page"
          errorId={errorId}
        />
      );
    }

    return (
      <ErrorBoundary
        level="page"
        onError={(error, errorInfo) => {
          reportPageError(error, {
            errorId: `page_error_${Date.now()}`,
            level: 'page',
            metadata: {
              componentStack: errorInfo.componentStack,
              errorBoundary: 'PageErrorBoundary',
            },
          });
        }}
      >
        {children}
      </ErrorBoundary>
    );
  }
}
