import { useAuth } from "@clerk/expo";
import {
  type QueryFunctionContext,
  type QueryKey,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { FphgoApiError } from "@/lib/api";

type AuthenticatedQueryFn<TQueryFnData, TQueryKey extends QueryKey> = (
  context: QueryFunctionContext<TQueryKey>,
  authToken: string,
) => TQueryFnData | Promise<TQueryFnData>;

type UseAuthenticatedFphgoQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> = Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryFn" | "enabled"> & {
  enabled?: boolean;
  queryFn: AuthenticatedQueryFn<TQueryFnData, TQueryKey>;
};

export function useAuthenticatedFphgoQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseAuthenticatedFphgoQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const isAuthReady = isLoaded && Boolean(isSignedIn);
  const enabled = (options.enabled ?? true) && isAuthReady;

  return useQuery({
    ...options,
    enabled,
    queryFn: async (context) => {
      const authToken = await getToken();

      if (!authToken) {
        throw new FphgoApiError(401, "Authentication required", null);
      }

      return options.queryFn(context, authToken);
    },
  });
}
