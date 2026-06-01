import { useAuth } from "@clerk/expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getManagedBookingPaymentProofUrl,
  getManagedSchool,
  listManagedBookings,
  listManagedCourses,
  listManagedMembers,
  listManagedPaymentMethods,
  listManagedSchools,
  listManagedSessions,
  reviewManagedBookingPayment,
  setManagedBookingStatus,
  setManagedSessionStatus,
} from "@/features/schools/api/school-management-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(
        401,
        "Checking your session. Try again in a moment.",
        null,
      );
    }
    if (!isSignedIn) {
      throw new FphgoApiError(401, "Sign in to manage schools.", null);
    }
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to manage schools.", null);
    return token;
  };
};

const requireValue = (value: string, message: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new FphgoApiError(400, message, null);
  return trimmed;
};

export const useManagedSchoolsQuery = (enabled = true) => {
  const getRequiredToken = useRequiredToken();

  return useQuery({
    enabled,
    queryFn: async () => {
      const response = await listManagedSchools(await getRequiredToken());
      return response.schools ?? [];
    },
    queryKey: mobileQueryKeys.schools.managedList(),
    retry: false,
    staleTime: 60 * 1000,
  });
};

export const useManagedSchoolQuery = (
  slug: string | undefined,
  enabled = true,
) => {
  const getRequiredToken = useRequiredToken();

  return useQuery({
    enabled: enabled && Boolean(slug),
    queryFn: async () => {
      const response = await getManagedSchool(
        requireValue(slug ?? "", "School unavailable."),
        await getRequiredToken(),
      );
      return response.school;
    },
    queryKey: mobileQueryKeys.schools.managedDetail(slug ?? ""),
    retry: false,
    staleTime: 60 * 1000,
  });
};

export const useManagedSchoolWorkspaceQueries = (
  slug: string | undefined,
  enabled = true,
) => {
  const getRequiredToken = useRequiredToken();
  const safeSlug = slug ?? "";

  const courses = useQuery({
    enabled: enabled && Boolean(slug),
    queryFn: async () => {
      const response = await listManagedCourses(
        requireValue(safeSlug, "School unavailable."),
        await getRequiredToken(),
      );
      return response.courses ?? [];
    },
    queryKey: mobileQueryKeys.schools.managedCourses(safeSlug),
    retry: false,
    staleTime: 60 * 1000,
  });

  const sessions = useQuery({
    enabled: enabled && Boolean(slug),
    queryFn: async () => {
      const response = await listManagedSessions(
        requireValue(safeSlug, "School unavailable."),
        await getRequiredToken(),
      );
      return response.sessions ?? [];
    },
    queryKey: mobileQueryKeys.schools.managedSessions(safeSlug),
    retry: false,
    staleTime: 60 * 1000,
  });

  const bookings = useQuery({
    enabled: enabled && Boolean(slug),
    queryFn: async () => {
      const response = await listManagedBookings(
        requireValue(safeSlug, "School unavailable."),
        await getRequiredToken(),
      );
      return response.bookings ?? [];
    },
    queryKey: mobileQueryKeys.schools.managedBookings(safeSlug),
    retry: false,
    staleTime: 30 * 1000,
  });

  const members = useQuery({
    enabled: enabled && Boolean(slug),
    queryFn: async () => {
      const response = await listManagedMembers(
        requireValue(safeSlug, "School unavailable."),
        await getRequiredToken(),
      );
      return response.members ?? [];
    },
    queryKey: mobileQueryKeys.schools.managedMembers(safeSlug),
    retry: false,
    staleTime: 60 * 1000,
  });

  const paymentMethods = useQuery({
    enabled: enabled && Boolean(slug),
    queryFn: async () => {
      const response = await listManagedPaymentMethods(
        requireValue(safeSlug, "School unavailable."),
        await getRequiredToken(),
      );
      return response.paymentMethods ?? [];
    },
    queryKey: mobileQueryKeys.schools.managedPaymentMethods(safeSlug),
    retry: false,
    staleTime: 60 * 1000,
  });

  return { bookings, courses, members, paymentMethods, sessions };
};

const invalidateSchoolManagement = (
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
) => {
  queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.schools.managedDetail(slug),
  });
  queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.schools.managedBookings(slug),
  });
  queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.schools.managedSessions(slug),
  });
  queryClient.invalidateQueries({
    queryKey: mobileQueryKeys.schools.managedList(),
  });
};

export const useManagedBookingStatusMutation = (slug: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      action: "approve" | "cancel" | "complete" | "reject";
      bookingId: string;
    }) => {
      const response = await setManagedBookingStatus(
        requireValue(slug, "School unavailable."),
        requireValue(payload.bookingId, "Booking unavailable."),
        payload.action,
        await getRequiredToken(),
      );
      return response.booking;
    },
    onSuccess: () => invalidateSchoolManagement(queryClient, slug),
  });
};

export const useManagedBookingPaymentMutation = (slug: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      action: "reject" | "verify";
      bookingId: string;
      reviewNotes?: string;
    }) => {
      const response = await reviewManagedBookingPayment(
        requireValue(slug, "School unavailable."),
        requireValue(payload.bookingId, "Booking unavailable."),
        payload.action,
        payload.reviewNotes,
        await getRequiredToken(),
      );
      return response.payment;
    },
    onSuccess: () => invalidateSchoolManagement(queryClient, slug),
  });
};

export const useManagedBookingProofUrlMutation = (slug: string) => {
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (bookingId: string) =>
      getManagedBookingPaymentProofUrl(
        requireValue(slug, "School unavailable."),
        requireValue(bookingId, "Booking unavailable."),
        await getRequiredToken(),
      ),
  });
};

export const useManagedSessionStatusMutation = (slug: string) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: {
      action: "cancel" | "complete";
      sessionId: string;
    }) => {
      const response = await setManagedSessionStatus(
        requireValue(slug, "School unavailable."),
        requireValue(payload.sessionId, "Session unavailable."),
        payload.action,
        await getRequiredToken(),
      );
      return response.session;
    },
    onSuccess: () => invalidateSchoolManagement(queryClient, slug),
  });
};
