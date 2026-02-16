import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { handleAxiosError } from '@/lib/error-reporting';

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken(): Promise<string | null>;
      };
    };
  }
}

// Auth token interceptor
export const createAuthTokenInterceptor = async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  // Get Clerk token if available (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const token = await window.Clerk?.session?.getToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (err) {
      console.log('No Clerk token available');
    }
  }

  return config;
};

// Error interceptor
export const createErrorInterceptor = (error: AxiosError) => {
  const { response, request, config } = error;

  // Report error for monitoring
  const endpoint = config?.url || 'unknown';
  handleAxiosError(error, endpoint);

  if (response) {
    // Server responded with error status
    const { status, data } = response;

    switch (status) {
      case 401:
        console.error('Unauthorized. Please sign in again.');
        // Redirect to sign-in if needed
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in';
        }
        break;
      case 403:
        console.error('Access denied. You do not have permission.');
        break;
      case 404:
        console.error('Resource not found.');
        break;
      case 422:
        // Validation errors
        if (data && typeof data === 'object' && 'errors' in data) {
          const errors = (data as any).errors;
          if (Array.isArray(errors)) {
            errors.forEach((err: any) => console.error(err.message || 'Validation error'));
          } else {
            console.error('Validation error');
          }
        } else {
          console.error('Invalid data provided.');
        }
        break;
      case 429:
        console.error('Too many requests. Please try again later.');
        break;
      case 500:
        console.error('Server error. Please try again later.');
        break;
      default:
        console.error(`Error ${status}: ${(data as any)?.message || 'Something went wrong'}`);
    }
  } else if (request) {
    // Network error
    console.error('Network error. Please check your connection.');
  } else {
    // Something else happened
    console.error('An unexpected error occurred.');
  }

  return Promise.reject(error);
};
