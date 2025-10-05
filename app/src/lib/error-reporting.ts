interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  level: 'page' | 'feature' | 'component';
  feature?: string;
  metadata?: Record<string, any>;
}

interface ErrorReportingService {
  reportError: (error: Error, context: Partial<ErrorReport>) => void;
  setUser: (userId: string) => void;
  clearUser: () => void;
}

class ErrorReporter implements ErrorReportingService {
  private userId?: string;
  private errorQueue: ErrorReport[] = [];
  private isOnline = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupNetworkListener();
      this.setupPeriodicFlush();
    }
  }

  private setupNetworkListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private setupPeriodicFlush() {
    // Flush errors every 30 seconds
    setInterval(() => {
      if (this.isOnline && this.errorQueue.length > 0) {
        this.flushErrorQueue();
      }
    }, 30000);
  }

  reportError(error: Error, context: Partial<ErrorReport>) {
    const errorReport: ErrorReport = {
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server',
      level: 'component',
      ...context,
    };

    // Add to queue
    this.errorQueue.push(errorReport);

    // Try to send immediately if online
    if (this.isOnline) {
      this.sendErrorReport(errorReport);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', errorReport);
    }
  }

  setUser(userId: string) {
    this.userId = userId;
  }

  clearUser() {
    this.userId = undefined;
  }

  private async sendErrorReport(errorReport: ErrorReport) {
    try {
      // In production, send to your error reporting service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...errorReport,
            userId: this.userId,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  private async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    for (const errorReport of errorsToSend) {
      await this.sendErrorReport(errorReport);
    }
  }
}

// Create singleton instance
export const errorReporter = new ErrorReporter();

// Utility functions for common error scenarios
export const reportError = (error: Error, context: Partial<ErrorReport> = {}) => {
  errorReporter.reportError(error, context);
};

export const reportFeatureError = (error: Error, featureName: string, context: Partial<ErrorReport> = {}) => {
  errorReporter.reportError(error, {
    ...context,
    level: 'feature',
    feature: featureName,
  });
};

export const reportPageError = (error: Error, context: Partial<ErrorReport> = {}) => {
  errorReporter.reportError(error, {
    ...context,
    level: 'page',
  });
};

export const reportComponentError = (error: Error, componentName: string, context: Partial<ErrorReport> = {}) => {
  errorReporter.reportError(error, {
    ...context,
    level: 'component',
    feature: componentName,
  });
};

// React Query error handler
export const handleQueryError = (error: any, queryKey: string[]) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  reportError(errorObj, {
    level: 'component',
    feature: queryKey[0],
    metadata: {
      queryKey,
      errorType: 'react-query',
    },
  });
};

// Axios error handler
export const handleAxiosError = (error: any, endpoint: string) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  reportError(errorObj, {
    level: 'component',
    feature: 'api',
    metadata: {
      endpoint,
      status: error.response?.status,
      statusText: error.response?.statusText,
    },
  });
};
