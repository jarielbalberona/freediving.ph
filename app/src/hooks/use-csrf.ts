import { useState, useEffect } from "react";

export default function useCsrf() {
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/csrf-token`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.data));
  }, []);

  return csrfToken;
}
