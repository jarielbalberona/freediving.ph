export { axiosInstance } from './axios';
export { createAuthTokenInterceptor, createErrorInterceptor } from './helpers';

// Re-export common HTTP methods with proper typing
export const http = {
  get: <T = any>(url: string, config?: any) =>
    axiosInstance.get<T>(url, config).then(res => res.data),

  post: <T = any>(url: string, data?: any, config?: any) =>
    axiosInstance.post<T>(url, data, config).then(res => res.data),

  put: <T = any>(url: string, data?: any, config?: any) =>
    axiosInstance.put<T>(url, data, config).then(res => res.data),

  patch: <T = any>(url: string, data?: any, config?: any) =>
    axiosInstance.patch<T>(url, data, config).then(res => res.data),

  delete: <T = any>(url: string, config?: any) =>
    axiosInstance.delete<T>(url, config).then(res => res.data),
};
