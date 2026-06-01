import { useAuth } from "@clerk/expo";
import type { ImagePickerAsset } from "expo-image-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import type {
  CourseBookingMode,
  CreateStudentCourseBookingRequest,
  PublicCourseSession,
  SchoolPaymentMethod,
} from "@freediving.ph/types";

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
  SessionRow,
  compactMarkdown,
  courseTypeLabel,
  levelLabel,
  moneyLabel,
  safeSegment,
} from "@/features/schools/components/school-ui";
import { useCreateCourseBookingMutation } from "@/features/schools/hooks/use-school-mutations";
import {
  usePublicCourseQuery,
  usePublicCourseSessionsQuery,
} from "@/features/schools/hooks/use-schools-query";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const nativeFileFromAsset = (asset: ImagePickerAsset, fallbackPrefix: string) => ({
  name: filenameForAsset(asset, fallbackPrefix),
  type: mimeTypeForAsset(asset),
  uri: asset.uri,
});

const todayDateString = () => new Date().toISOString().slice(0, 10);

const paymentMethodLabel = (method: SchoolPaymentMethod | undefined) =>
  method?.name?.trim() ||
  [method?.bankName, method?.accountName].filter(Boolean).join(" · ") ||
  method?.type ||
  "Payment method";

export function CourseDetailScreen() {
  const params = useLocalSearchParams<{
    courseSlug?: string | string[];
    slug?: string | string[];
  }>();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const slug = safeSegment(firstParam(params.slug));
  const courseSlug = safeSegment(firstParam(params.courseSlug));
  const courseQuery = usePublicCourseQuery(slug, courseSlug);
  const sessionsQuery = usePublicCourseSessionsQuery(slug, courseSlug);
  const course = courseQuery.data?.course;
  const school = courseQuery.data?.school;
  const sessions = sessionsQuery.data ?? [];
  const activePaymentMethods = (school?.paymentMethods ?? []).filter(
    (method) => method.isActive,
  );
  const initialMode = useMemo<CourseBookingMode>(
    () =>
      course?.allowSessionBooking && !course.allowPreferredDateRequest
        ? "session"
        : "preferred_date",
    [course],
  );
  const [bookingMode, setBookingMode] = useState<CourseBookingMode>(initialMode);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [preferredDate, setPreferredDate] = useState(todayDateString());
  const [alternateDate, setAlternateDate] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [certificationLevel, setCertificationLevel] = useState("");
  const [equipmentNeeds, setEquipmentNeeds] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [receipt, setReceipt] = useState<ImagePickerAsset | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const createBooking = useCreateCourseBookingMutation(slug ?? "", courseSlug ?? "");
  const selectedPaymentMethod = activePaymentMethods.find(
    (method) => method.id === selectedPaymentMethodId,
  );
  const canBook = Boolean(
    course &&
      isLoaded &&
      isSignedIn &&
      (course.allowSessionBooking || course.allowPreferredDateRequest),
  );
  const paidCourseUnavailable =
    Boolean(course?.paymentRequired) && activePaymentMethods.length === 0;

  const chooseReceipt = async () => {
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
    setReceipt(asset);
    setMessage("Receipt selected.");
  };

  const submitBooking = async () => {
    if (!slug || !courseSlug || !course) return;
    if (!isLoaded || !isSignedIn) {
      setMessage("Sign in to request a booking.");
      return;
    }
    if (paidCourseUnavailable) {
      setMessage("This paid course is not ready for mobile booking yet.");
      return;
    }
    if (bookingMode === "session" && !selectedSessionId) {
      setMessage("Choose an available schedule.");
      return;
    }
    if (bookingMode === "preferred_date" && !preferredDate.trim()) {
      setMessage("Enter a preferred date.");
      return;
    }
    setMessage(null);
    const payload: CreateStudentCourseBookingRequest = {
      alternateDate: alternateDate.trim() || undefined,
      bookingMode,
      certificationLevel: certificationLevel.trim() || undefined,
      equipmentNeeds: equipmentNeeds.trim() || undefined,
      experienceLevel: experienceLevel.trim() || undefined,
      preferredDate: bookingMode === "preferred_date" ? preferredDate.trim() : undefined,
      sessionId: bookingMode === "session" ? selectedSessionId : undefined,
      studentEmail: studentEmail.trim() || undefined,
      studentName: studentName.trim() || undefined,
      studentNote: studentNote.trim() || undefined,
      studentPhone: studentPhone.trim() || undefined,
    };
    try {
      const booking = await createBooking.mutateAsync(payload);
      setCreatedBookingId(booking.id);
      if (receipt && selectedPaymentMethod) {
        const token = await getToken();
        if (!token) {
          setMessage("Booking created. Sign in again to upload the receipt.");
          return;
        }
        const upload = await uploadMediaFiles(
          [nativeFileFromAsset(receipt, "course-booking-receipt")],
          "course_booking_receipt",
          token,
          booking.id,
        );
        const proofMediaId = upload.items[0]?.id;
        if (!proofMediaId) {
          setMessage("Booking created, but receipt upload did not return media.");
          return;
        }
        const { submitMyCourseBookingPayment } = await import(
          "@/features/schools/api/schools-api"
        );
        await submitMyCourseBookingPayment(
          booking.id,
          {
            paymentMethodId: selectedPaymentMethod.id,
            proofMediaId,
          },
          token,
        );
      }
      setMessage("Booking submitted. The school will review your request.");
      setReceipt(undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Booking failed.");
    }
  };

  return (
    <MobileScrollScreen subtitle={school?.name ?? "Course"} title={course?.title ?? "Course"}>
      {!slug || !courseSlug ? (
        <MobileErrorState message="The course link is invalid." title="Course unavailable" />
      ) : null}

      {courseQuery.isLoading ? <MobileLoadingState message="Loading course." /> : null}
      {courseQuery.error ? (
        <MobileErrorState
          message="This course could not be loaded."
          title="Course unavailable"
        />
      ) : null}

      {course ? (
        <>
          <MobileSection title="Course details">
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <Text className="text-xl font-bold text-foreground">{course.title}</Text>
              <Text className="text-sm text-muted-foreground">
                {courseTypeLabel(course.courseType)} · {levelLabel(course.level)} ·{" "}
                {moneyLabel(course.priceAmount, course.currency)}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {compactMarkdown(course.descriptionMarkdown, course.shortDescription)}
              </Text>
              {course.durationLabel ? (
                <Text className="text-sm text-muted-foreground">
                  Duration: {course.durationLabel}
                </Text>
              ) : null}
              {course.locationLabel || course.formattedAddress ? (
                <Text className="text-sm text-muted-foreground">
                  Location: {course.locationLabel || course.formattedAddress}
                </Text>
              ) : null}
              {course.availabilityNote ? (
                <Text className="text-sm text-muted-foreground">
                  Availability: {course.availabilityNote}
                </Text>
              ) : null}
            </View>
          </MobileSection>

          {course.includedMarkdown || course.prerequisitesMarkdown || course.equipmentMarkdown ? (
            <MobileSection title="Before you book">
              <View className="gap-3 rounded-2xl border border-border bg-card p-4">
                {course.includedMarkdown ? (
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Included: {compactMarkdown(course.includedMarkdown)}
                  </Text>
                ) : null}
                {course.prerequisitesMarkdown ? (
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Prerequisites: {compactMarkdown(course.prerequisitesMarkdown)}
                  </Text>
                ) : null}
                {course.equipmentMarkdown ? (
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Equipment: {compactMarkdown(course.equipmentMarkdown)}
                  </Text>
                ) : null}
              </View>
            </MobileSection>
          ) : null}

          <MobileSection title="Schedules">
            {sessionsQuery.isLoading ? <MobileLoadingState message="Loading schedules." /> : null}
            {!sessionsQuery.isLoading && sessions.length === 0 ? (
              <MobileEmptyState
                description={
                  course.allowPreferredDateRequest
                    ? "No schedules are published, but you can request a preferred date."
                    : "No schedules are published yet."
                }
                title="No schedules"
              />
            ) : (
              <View className="gap-3">
                {sessions.map((session: PublicCourseSession) => (
                  <SessionRow
                    key={session.id}
                    onPress={
                      course.allowSessionBooking
                        ? () => {
                            setBookingMode("session");
                            setSelectedSessionId(session.id);
                          }
                        : undefined
                    }
                    selected={selectedSessionId === session.id}
                    session={session}
                  />
                ))}
              </View>
            )}
          </MobileSection>

          <MobileSection title="Booking">
            {!isSignedIn ? (
              <MobileEmptyState
                description="Sign in to request a course booking."
                title="Authentication required"
              />
            ) : !course.allowSessionBooking && !course.allowPreferredDateRequest ? (
              <MobileEmptyState
                description="This course is not accepting mobile bookings."
                title="Booking unavailable"
              />
            ) : (
              <View className="gap-3 rounded-2xl border border-border bg-card p-4">
                {course.allowSessionBooking && course.allowPreferredDateRequest ? (
                  <View className="flex-row flex-wrap gap-2">
                    <MobileButton
                      variant={bookingMode === "session" ? "primary" : "secondary"}
                      onPress={() => setBookingMode("session")}
                    >
                      Schedule
                    </MobileButton>
                    <MobileButton
                      variant={bookingMode === "preferred_date" ? "primary" : "secondary"}
                      onPress={() => setBookingMode("preferred_date")}
                    >
                      Preferred date
                    </MobileButton>
                  </View>
                ) : null}
                {bookingMode === "preferred_date" ? (
                  <View className="gap-2">
                    <TextInput
                      className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                      onChangeText={setPreferredDate}
                      placeholder="Preferred date YYYY-MM-DD"
                      placeholderTextColor="#64748b"
                      value={preferredDate}
                    />
                    <TextInput
                      className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                      onChangeText={setAlternateDate}
                      placeholder="Alternate date YYYY-MM-DD"
                      placeholderTextColor="#64748b"
                      value={alternateDate}
                    />
                  </View>
                ) : null}
                <TextInput
                  className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                  onChangeText={setStudentName}
                  placeholder="Name"
                  placeholderTextColor="#64748b"
                  value={studentName}
                />
                <TextInput
                  className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                  keyboardType="email-address"
                  onChangeText={setStudentEmail}
                  placeholder="Email"
                  placeholderTextColor="#64748b"
                  value={studentEmail}
                />
                <TextInput
                  className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                  keyboardType="phone-pad"
                  onChangeText={setStudentPhone}
                  placeholder="Phone"
                  placeholderTextColor="#64748b"
                  value={studentPhone}
                />
                <TextInput
                  className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                  onChangeText={setExperienceLevel}
                  placeholder="Experience"
                  placeholderTextColor="#64748b"
                  value={experienceLevel}
                />
                <TextInput
                  className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                  onChangeText={setCertificationLevel}
                  placeholder="Certification"
                  placeholderTextColor="#64748b"
                  value={certificationLevel}
                />
                <TextInput
                  className="min-h-11 rounded-2xl border border-border bg-background px-4 text-foreground"
                  onChangeText={setEquipmentNeeds}
                  placeholder="Equipment needs"
                  placeholderTextColor="#64748b"
                  value={equipmentNeeds}
                />
                <TextInput
                  className="min-h-24 rounded-2xl border border-border bg-background p-4 text-foreground"
                  multiline
                  onChangeText={setStudentNote}
                  placeholder="Note"
                  placeholderTextColor="#64748b"
                  value={studentNote}
                />

                {course.paymentRequired ? (
                  <View className="gap-3 rounded-2xl border border-border bg-background p-3">
                    <Text className="font-semibold text-foreground">Payment instructions</Text>
                    {activePaymentMethods.length === 0 ? (
                      <Text className="text-sm text-muted-foreground">
                        This school has not configured public payment instructions.
                      </Text>
                    ) : (
                      <>
                        <View className="flex-row flex-wrap gap-2">
                          {activePaymentMethods.map((method) => (
                            <MobileButton
                              key={method.id}
                              variant={
                                selectedPaymentMethodId === method.id ? "primary" : "secondary"
                              }
                              onPress={() => setSelectedPaymentMethodId(method.id)}
                            >
                              {paymentMethodLabel(method)}
                            </MobileButton>
                          ))}
                        </View>
                        {selectedPaymentMethod ? (
                          <Text className="text-sm leading-5 text-muted-foreground">
                            {[
                              selectedPaymentMethod.instructions,
                              selectedPaymentMethod.bankName,
                              selectedPaymentMethod.accountName,
                              selectedPaymentMethod.accountNumber,
                            ]
                              .filter(Boolean)
                              .join("\n")}
                          </Text>
                        ) : null}
                        <MobileButton
                          disabled={!selectedPaymentMethod}
                          variant="secondary"
                          onPress={chooseReceipt}
                        >
                          {receipt ? "Replace receipt" : "Choose receipt"}
                        </MobileButton>
                      </>
                    )}
                  </View>
                ) : null}

                {message ? (
                  <Text className="text-sm text-muted-foreground">{message}</Text>
                ) : null}
                <MobileButton
                  disabled={!canBook || createBooking.isPending || paidCourseUnavailable}
                  onPress={submitBooking}
                >
                  {createBooking.isPending ? "Submitting..." : "Submit booking"}
                </MobileButton>
                {createdBookingId ? (
                  <MobileButton
                    variant="secondary"
                    onPress={() => router.push("/(app)/(tabs)/(home)/schools/bookings")}
                  >
                    View my bookings
                  </MobileButton>
                ) : null}
              </View>
            )}
          </MobileSection>
        </>
      ) : null}
    </MobileScrollScreen>
  );
}
