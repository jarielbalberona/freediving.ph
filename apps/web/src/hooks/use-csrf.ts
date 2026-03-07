import { useState, useEffect } from "react";
import { apiCall } from "@/lib/api";

export default function useCsrf() {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await apiCall<string>("/csrf-token");
        setCsrfToken(res.data);
      } catch (error) {
        console.error("Error fetching CSRF token:", error);
      }
    };
    fetchCsrfToken();
  }, []);

  return csrfToken;
}
