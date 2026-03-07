"use client";

import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { ErrorFallback } from '@/components/error-boundary';
import { reportPageError } from '@/lib/error-reporting';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Report the error
    reportPageError(error, {
      errorId: error.digest || `page_error_${Date.now()}`,
    });
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      resetError={reset}
      level="page"
      errorId={error.digest || `page_error_${Date.now()}`}
    />
  );
}
