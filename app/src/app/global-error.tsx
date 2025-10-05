"use client";

import { useEffect } from 'react';
import { ErrorBoundary, NetworkErrorBoundary } from '@/components/error-boundary';
import { ErrorFallback } from '@/components/error-boundary';
import { reportPageError } from '@/lib/error-reporting';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report the error
    reportPageError(error, {
      errorId: error.digest || `global_error_${Date.now()}`,
    });
  }, [error]);

  return (
    <html>
      <body>
        <NetworkErrorBoundary>
          <ErrorFallback
            error={error}
            resetError={reset}
            level="page"
            errorId={error.digest || `global_error_${Date.now()}`}
          />
        </NetworkErrorBoundary>
      </body>
    </html>
  );
}
