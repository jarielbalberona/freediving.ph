type ClerkTokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>;

let tokenGetter: ClerkTokenGetter | null = null;

export function setMobileAuthTokenGetter(getToken: ClerkTokenGetter | null) {
  tokenGetter = getToken;
}

export async function getMobileAuthToken() {
  if (!tokenGetter) {
    return null;
  }

  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}
