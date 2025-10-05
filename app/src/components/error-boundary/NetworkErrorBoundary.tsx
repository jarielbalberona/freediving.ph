"use client";

import { Component, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasNetworkError: boolean;
  error: Error | null;
}

export class NetworkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasNetworkError: false,
      error: null,
    };
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen for fetch errors
    this.setupGlobalErrorHandlers();
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private setupGlobalErrorHandlers = () => {
    // Override fetch to catch network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        // Check if the response indicates a network error
        if (!response.ok && response.status >= 500) {
          this.handleNetworkError(new Error(`Server error: ${response.status}`));
        }

        return response;
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          this.handleNetworkError(error);
        }
        throw error;
      }
    };
  };

  private handleOnline = () => {
    if (this.state.hasNetworkError) {
      this.setState({
        hasNetworkError: false,
        error: null,
      });
    }
  };

  private handleOffline = () => {
    this.setState({
      hasNetworkError: true,
      error: new Error('No internet connection'),
    });
  };

  private handleNetworkError = (error: Error) => {
    this.setState({
      hasNetworkError: true,
      error,
    });
  };

  private resetError = () => {
    this.setState({
      hasNetworkError: false,
      error: null,
    });
  };

  render() {
    const { hasNetworkError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasNetworkError && error) {
      return fallback || (
        <ErrorFallback
          error={error}
          resetError={this.resetError}
          level="page"
          isNetworkError={true}
        />
      );
    }

    return children;
  }
}
