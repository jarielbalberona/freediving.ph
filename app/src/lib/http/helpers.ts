import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'sonner';
import { handleAxiosError } from '@/lib/error-reporting';

// Auth token interceptor
export const createAuthTokenInterceptor = async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
  // Get Clerk token if available (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const { getToken } = await import('@clerk/nextjs');
      const token = await getToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    } catch (error) {
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
        toast.error('Unauthorized. Please sign in again.');
        // Redirect to sign-in if needed
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in';
        }
        break;
      case 403:
        toast.error('Access denied. You do not have permission.');
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 422:
        // Validation errors
        if (data && typeof data === 'object' && 'errors' in data) {
          const errors = (data as any).errors;
          if (Array.isArray(errors)) {
            errors.forEach((err: any) => toast.error(err.message || 'Validation error'));
          } else {
            toast.error('Validation error');
          }
        } else {
          toast.error('Invalid data provided.');
        }
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(`Error ${status}: ${data?.message || 'Something went wrong'}`);
    }
  } else if (request) {
    // Network error
    toast.error('Network error. Please check your connection.');
  } else {
    // Something else happened
    toast.error('An unexpected error occurred.');
  }

  return Promise.reject(error);
};
