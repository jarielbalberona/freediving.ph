import { useAuth } from "@clerk/expo";
import type { ImagePickerAsset } from "expo-image-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import type { MyCourseBooking } from "@freediving.ph/types";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { uploadMediaFiles } from "@/features/media/api/media-api";
import {
  filenameForAsset,
  mimeTypeForAsset,
  validatePhotoAsset,
} from "@/features/media/lib/media-upload-guards";
import {
  formatDateTime,
  paymentStatusLabel,
  statusLabel,
} from "@/features/schools/components/school-ui";
import {
  useCancelCourseBookingMutation,
  useSubmitCourseBookingPaymentMutation,
} from "@/features/schools/hooks/use-school-mutations";
import { useMyCourseBookingsQuery } from "@/features/schools/hooks/use-schools-query";

const nativeFileFromAsset = (asset: ImagePickerAsset, fallbackPrefix: string) => ({
  name: filenameForAsset(asset, fallbackPrefix),
  type: mimeTypeForAsset(asset),
  uri: asset.uri,
});

const canCancelBooking = (booking: MyCourseBooking) =>
  ["pending_review", "approved", "scheduled"].includes(booking.status);

const canUploadPayment = (booking: MyCourseBooking) =>
  Boolean(
    booking.payment &&
      ["pending_upload", "submitted", "rejected"].includes(booking.payment.status),
  );

function BookingCard({ booking }: { booking: MyCourseBooking }) {
  const { getToken } = useAuth();
  const cancelMutation = useCancelCourseBookingMutation();
  const paymentMutation = useSubmitCourseBookingPaymentMutation();
  const [message, setMessage] = useState<string | null>(null);

  const uploadReceipt = async () => {
    if (!booking.payment) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
    if (!permission.granted) {
      setMessage("Allow photo library access to choose a receipt.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const error = asset ? validatePhotoAsset(asset) : "Choose a receipt image.";
    if (error) {
      setMessage(error);
      return;
    }
    const token = await getToken();
    if (!token) {
      setMessage("Sign in to upload a receipt.");
      return;
    }
    try {
      const upload = await uploadMediaFiles(
        [nativeFileFromAsset(asset, "course-booking-receipt")],
        "course_booking_receipt",
        token,
        booking.id,
      );
      const proofMediaId = upload.items[0]?.id;
      if (!proofMediaId) {
        setMessage("Receipt upload did not return media.");
        return;
      }
      await paymentMutation.mutateAsync({
        bookingId: booking.id,
        payload: {
          paymentMethodId: booking.payment.paymentMethodId || undefined,
          proofMediaId,
          referenceNumber: booking.payment.referenceNumber || undefined,
        },
      });
      setMessage("Receipt submitted for school review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Receipt upload failed.");
    }
  };

  const cancel = () => {
    Alert.alert("Cancel booking", "Cancel this course booking request?", [
      { style: "cancel", text: "Keep booking" },
      {
        style: "destructive",
        text: "Cancel booking",
        onPress: () => {
          void cancelMutation.mutateAsync(booking.id).catch((error) => {
            setMessage(error instanceof Error ? error.message : "Cancellation failed.");
          });
        },
      },
    ]);
  };

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <View className="gap-1">
        <Text className="text-base font-semibold text-foreground">
          {booking.courseTitle}
        </Text>
        {booking.schoolName ? (
          <Text className="text-sm text-muted-foreground">{booking.schoolName}</Text>
        ) : null}
        <Text className="text-sm text-muted-foreground">
          {booking.bookingMode === "session"
            ? booking.sessionTitle || "Selected schedule"
            : `Preferred date ${booking.preferredDate || "TBA"}`}
        </Text>
        {booking.scheduledAt ? (
          <Text className="text-sm text-muted-foreground">
            Scheduled {formatDateTime(booking.scheduledAt)}
          </Text>
        ) : null}
        <Text className="text-sm text-muted-foreground">
          Status: {statusLabel(booking.status)}
        </Text>
        {booking.payment ? (
          <Text className="text-sm text-muted-foreground">
            Payment: {paymentStatusLabel(booking.payment.status)}
          </Text>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {canUploadPayment(booking) ? (
          <MobileButton
            disabled={paymentMutation.isPending}
            variant="secondary"
            onPress={uploadReceipt}
          >
            {booking.payment?.proofMediaId ? "Replace receipt" : "Upload receipt"}
          </MobileButton>
        ) : null}
        {canCancelBooking(booking) ? (
          <MobileButton
            disabled={cancelMutation.isPending}
            variant="danger"
            onPress={cancel}
          >
            Cancel
          </MobileButton>
        ) : null}
      </View>
      {message ? <Text className="text-sm text-muted-foreground">{message}</Text> : null}
    </View>
  );
}

export function MyCourseBookingsScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const bookingsQuery = useMyCourseBookingsQuery(isLoaded && Boolean(isSignedIn));
  const bookings = bookingsQuery.data ?? [];

  return (
    <MobileScrollScreen subtitle="Course requests" title="My bookings">
      {!isSignedIn ? (
        <MobileEmptyState
          description="Sign in to view course bookings."
          title="Authentication required"
        />
      ) : null}
      {bookingsQuery.isLoading ? <MobileLoadingState message="Loading bookings." /> : null}
      {bookingsQuery.error ? (
        <MobileErrorState
          message="Your bookings are taking longer than expected to load."
          title="Bookings unavailable"
        />
      ) : null}
      {isSignedIn && !bookingsQuery.isLoading && !bookingsQuery.error ? (
        <MobileSection title="Bookings">
          {bookings.length === 0 ? (
            <MobileEmptyState
              description="Bookings you request from mobile or web will appear here."
              title="No bookings yet"
            />
          ) : (
            <View className="gap-3">
              {bookings.map((booking) => (
                <BookingCard booking={booking} key={booking.id} />
              ))}
            </View>
          )}
        </MobileSection>
      ) : null}
    </MobileScrollScreen>
  );
}
