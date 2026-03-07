import axios from "axios";
import { createAuthTokenInterceptor, createErrorInterceptor } from "./helpers";
import {
  getFphgoBaseUrlClient,
  getFphgoBaseUrlServer,
} from "@/lib/api/fphgo-base-url";

const API_BASE_URL =
  typeof window === "undefined"
    ? getFphgoBaseUrlServer()
    : getFphgoBaseUrlClient();

// Create an Axios instance
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies in requests
  timeout: 10000, // 10 second timeout
});

axiosInstance.interceptors.request.use(
  createAuthTokenInterceptor,
  (error: Error) => Promise.reject(new Error(error.message)),
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  createErrorInterceptor,
);
