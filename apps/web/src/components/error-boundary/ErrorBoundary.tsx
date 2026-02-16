"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  level?: 'page' | 'feature' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to external service
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you would send this to an error reporting service
    // like Sentry, LogRocket, or Bugsnag
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
    };

    // Example: Send to external service
    if (process.env.NODE_ENV === 'production') {
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // }).catch(console.error);
    }

    console.error('Error Report:', errorReport);
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorFallback = () => {
    const { error, errorId } = this.state;
    const { level = 'component' } = this.props;

    const getErrorTitle = () => {
      switch (level) {
        case 'page':
          return 'Something went wrong with this page';
        case 'feature':
          return 'This feature is temporarily unavailable';
        case 'component':
          return 'This component encountered an error';
        default:
          return 'Something went wrong';
      }
    };

    const getErrorDescription = () => {
      switch (level) {
        case 'page':
          return 'We encountered an unexpected error while loading this page. Please try refreshing or contact support if the problem persists.';
        case 'feature':
          return 'This feature is experiencing issues. You can continue using other parts of the application.';
        case 'component':
          return 'This component failed to render properly. The rest of the page should work normally.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    };

    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertDescription>
                {getErrorDescription()}
              </AlertDescription>
            </Alert>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Error Details (Development)
                </summary>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-red-600">
                    {error.message}
                  </p>
                  {error.stack && (
                    <pre className="mt-2 text-xs font-mono text-muted-foreground overflow-auto">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              {level === 'page' && (
                <>
                  <Button variant="outline" onClick={this.handleReload} className="w-full">
                    Reload Page
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </>
              )}
            </div>

            {errorId && (
              <p className="text-xs text-muted-foreground text-center">
                Error ID: {errorId}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback || this.renderErrorFallback();
    }

    return children;
  }
}
