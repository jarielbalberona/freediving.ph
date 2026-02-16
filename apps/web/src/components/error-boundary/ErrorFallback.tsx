"use client";

import { AlertTriangle, RefreshCw, Home, Bug, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  level?: 'page' | 'feature' | 'component';
  isNetworkError?: boolean;
  errorId?: string;
}

export function ErrorFallback({
  error,
  resetError,
  level = 'component',
  isNetworkError = false,
  errorId,
}: ErrorFallbackProps) {
  const getErrorTitle = () => {
    if (isNetworkError) {
      return 'Connection Problem';
    }

    switch (level) {
      case 'page':
        return 'Page Error';
      case 'feature':
        return 'Feature Unavailable';
      case 'component':
        return 'Component Error';
      default:
        return 'Something went wrong';
    }
  };

  const getErrorDescription = () => {
    if (isNetworkError) {
      return 'Please check your internet connection and try again.';
    }

    switch (level) {
      case 'page':
        return 'We encountered an error while loading this page. Please try refreshing.';
      case 'feature':
        return 'This feature is temporarily unavailable. You can continue using other parts of the app.';
      case 'component':
        return 'This component failed to load. The rest of the page should work normally.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const getIcon = () => {
    if (isNetworkError) {
      return <WifiOff className="h-6 w-6 text-orange-600" />;
    }
    return <AlertTriangle className="h-6 w-6 text-red-600" />;
  };

  const getIconBg = () => {
    if (isNetworkError) {
      return 'bg-orange-100';
    }
    return 'bg-red-100';
  };

  return (
    <div className="min-h-[300px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${getIconBg()}`}>
            {getIcon()}
          </div>
          <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={isNetworkError ? 'default' : 'destructive'}>
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
                  <pre className="mt-2 text-xs font-mono text-muted-foreground overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={resetError} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            {level === 'page' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Reload Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
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
}
