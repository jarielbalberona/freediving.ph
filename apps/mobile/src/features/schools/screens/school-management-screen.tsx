import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, Pressable, Text, TextInput, View } from "react-native";
import type {
  CourseBookingRequest,
  CourseBookingStatus,
  CourseSession,
  School,
} from "@freediving.ph/types";

import { StatusPill } from "@/components/social";
import {
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  useManagedBookingPaymentMutation,
  useManagedBookingProofUrlMutation,
  useManagedBookingStatusMutation,
  useManagedSchoolQuery,
  useManagedSchoolsQuery,
  useManagedSchoolWorkspaceQueries,
  useManagedSessionStatusMutation,
} from "@/features/schools/hooks/use-school-management";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const titleCase = (value: string | undefined) =>
  (value ?? "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unknown";

const canMutateSchool = (school: School | undefined) =>
  school?.currentUserRole === "owner" || school?.currentUserRole === "admin";

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { style: "cancel", text: "Cancel" },
    { onPress: onConfirm, style: "destructive", text: "Confirm" },
  ]);
};

const bookingSearchValue = (booking: CourseBookingRequest) =>
  [
    booking.studentName,
    booking.studentEmail,
    booking.studentPhone,
    booking.courseTitle,
    booking.sessionTitle,
    booking.status,
    booking.payment?.status,
    booking.payment?.referenceNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const countBookings = (
  bookings: CourseBookingRequest[],
  status: CourseBookingStatus,
) => bookings.filter((booking) => booking.status === status).length;

function SchoolSwitcher({
  schools,
  selectedSlug,
  onSelect,
}: {
  onSelect: (slug: string) => void;
  schools: School[];
  selectedSlug: string;
}) {
  return (
    <View className="gap-3">
      {schools.map((school) => {
        const selected = school.slug === selectedSlug;
        return (
          <Pressable
            accessibilityRole="button"
            className={`rounded-2xl border p-4 ${
              selected ? "border-primary bg-primary/10" : "border-border bg-card"
            }`}
            key={school.id}
            onPress={() => onSelect(school.slug)}
          >
            <View className="gap-2">
              <Text className="text-base font-semibold text-foreground">
                {school.name}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <StatusPill tone={selected ? "primary" : "neutral"}>
                  {titleCase(school.currentUserRole)}
                </StatusPill>
                <StatusPill>{titleCase(school.status)}</StatusPill>
                <StatusPill>{school.pendingBookingCount} pending</StatusPill>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SchoolManagementScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const initialSlug = firstParam(params.slug) ?? "";
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [search, setSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"all" | CourseBookingStatus>(
    "all",
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const schoolsQuery = useManagedSchoolsQuery();
  const schools = schoolsQuery.data ?? [];
  const fallbackSlug = selectedSlug || schools[0]?.slug || "";
  const schoolQuery = useManagedSchoolQuery(fallbackSlug, Boolean(fallbackSlug));
  const school = schoolQuery.data ?? schools.find((item) => item.slug === fallbackSlug);
  const canMutate = canMutateSchool(school);
  const workspace = useManagedSchoolWorkspaceQueries(
    fallbackSlug,
    Boolean(fallbackSlug && school),
  );
  const bookingMutation = useManagedBookingStatusMutation(fallbackSlug);
  const paymentMutation = useManagedBookingPaymentMutation(fallbackSlug);
  const proofUrlMutation = useManagedBookingProofUrlMutation(fallbackSlug);
  const sessionMutation = useManagedSessionStatusMutation(fallbackSlug);
  const bookings = workspace.bookings.data ?? [];
  const courses = workspace.courses.data ?? [];
  const sessions = workspace.sessions.data ?? [];
  const members = workspace.members.data ?? [];
  const paymentMethods = workspace.paymentMethods.data ?? [];
  const filteredBookings = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus =
        bookingStatus === "all" || booking.status === bookingStatus;
      const matchesSearch =
        !needle || bookingSearchValue(booking).includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [bookingStatus, bookings, search]);

  const updateBooking = (
    booking: CourseBookingRequest,
    action: "approve" | "cancel" | "complete" | "reject",
  ) => {
    bookingMutation.mutate(
      { action, bookingId: booking.id },
      {
        onError: () => setMessage("Could not update booking. Try again."),
        onSuccess: () => setMessage("Booking updated."),
      },
    );
  };

  const updatePayment = (
    booking: CourseBookingRequest,
    action: "reject" | "verify",
  ) => {
    paymentMutation.mutate(
      { action, bookingId: booking.id, reviewNotes },
      {
        onError: () => setMessage("Could not review payment. Try again."),
        onSuccess: () => {
          setMessage(action === "verify" ? "Payment approved." : "Payment rejected.");
          setReviewNotes("");
        },
      },
    );
  };

  const openProof = (booking: CourseBookingRequest) => {
    if (!booking.payment) {
      setMessage("Payment proof unavailable.");
      return;
    }
    proofUrlMutation.mutate(booking.id, {
      onError: () => setMessage("Could not open payment proof."),
      onSuccess: (proof) => void Linking.openURL(proof.url),
    });
  };

  const updateSession = (session: CourseSession, action: "cancel" | "complete") => {
    sessionMutation.mutate(
      { action, sessionId: session.id },
      {
        onError: () => setMessage("Could not update session. Try again."),
        onSuccess: () => setMessage("Session updated."),
      },
    );
  };

  return (
    <MobileScrollScreen subtitle="Operations" title="Manage Schools">
      {schoolsQuery.isLoading ? (
        <MobileLoadingState message="Loading managed schools." />
      ) : null}
      {schoolsQuery.error ? (
        <View className="gap-3">
          <MobileErrorState
            message="School management is unavailable for this account."
            title="Management unavailable"
          />
          <MobileButton
            variant="secondary"
            onPress={() => void schoolsQuery.refetch()}
          >
            Try again
          </MobileButton>
        </View>
      ) : null}
      {!schoolsQuery.isLoading && !schoolsQuery.error && schools.length === 0 ? (
        <MobileEmptyState
          description="Only school owners, admins, or instructors can open school management."
          title="No managed schools"
        />
      ) : null}

      {schools.length > 0 ? (
        <>
          <MobileSection title="Your schools">
            <SchoolSwitcher
              onSelect={(slug) => {
                setSelectedSlug(slug);
                setMessage(null);
              }}
              schools={schools}
              selectedSlug={fallbackSlug}
            />
          </MobileSection>

          {schoolQuery.isLoading ? (
            <MobileLoadingState message="Loading school workspace." />
          ) : null}
          {schoolQuery.error ? (
            <MobileErrorState
              message="You may not have access to this school workspace."
              title="School unavailable"
            />
          ) : null}

          {school ? (
            <>
              <MobileSection title={school.name}>
                <MobileCard>
                  <View className="gap-3">
                    <View className="flex-row flex-wrap gap-2">
                      <StatusPill tone="primary">
                        {titleCase(school.currentUserRole)}
                      </StatusPill>
                      <StatusPill>{titleCase(school.status)}</StatusPill>
                      {canMutate ? (
                        <StatusPill tone="primary">Owner/admin actions</StatusPill>
                      ) : (
                        <StatusPill>Read-only instructor</StatusPill>
                      )}
                    </View>
                    <View className="gap-2 divide-y divide-border/40">
                      <Text className="text-sm text-muted-foreground">
                        Courses: {courses.length} · Sessions: {sessions.length}
                      </Text>
                      <Text className="pt-2 text-sm text-muted-foreground">
                        Pending bookings: {countBookings(bookings, "pending_review")}
                      </Text>
                      <Text className="pt-2 text-sm text-muted-foreground">
                        Payments to review:{" "}
                        {
                          bookings.filter(
                            (booking) => booking.payment?.status === "submitted",
                          ).length
                        }
                      </Text>
                    </View>
                  </View>
                </MobileCard>
              </MobileSection>

              <MobileSection title="Bookings">
                <View className="gap-3">
                  {message ? (
                    <Text className="text-sm text-muted-foreground">{message}</Text>
                  ) : null}
                  <TextInput
                    autoCapitalize="none"
                    className="min-h-11 rounded-2xl border border-border bg-card px-3 text-foreground"
                    onChangeText={setSearch}
                    placeholder="Search student, course, reference"
                    placeholderTextColor="#64748b"
                    value={search}
                  />
                  <View className="flex-row flex-wrap gap-2">
                    {(
                      [
                        "all",
                        "pending_review",
                        "approved",
                        "scheduled",
                        "completed",
                      ] as const
                    ).map((status) => (
                      <MobileButton
                        key={status}
                        variant={bookingStatus === status ? "primary" : "secondary"}
                        onPress={() => setBookingStatus(status)}
                      >
                        {status === "all" ? "All" : titleCase(status)}
                      </MobileButton>
                    ))}
                  </View>
                  {workspace.bookings.isLoading ? (
                    <MobileLoadingState message="Loading bookings." />
                  ) : null}
                  {workspace.bookings.error ? (
                    <MobileErrorState
                      message="Booking management is unavailable."
                      title="Bookings unavailable"
                    />
                  ) : null}
                  {!workspace.bookings.isLoading &&
                  !workspace.bookings.error &&
                  filteredBookings.length === 0 ? (
                    <MobileEmptyState
                      description="No bookings match the current filters."
                      title="No bookings"
                    />
                  ) : null}

                  {filteredBookings.map((booking) => (
                    <MobileCard key={booking.id}>
                      <View className="gap-3">
                        <View className="gap-1">
                          <Text className="text-base font-semibold text-foreground">
                            {booking.studentName || "Student"}
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            <StatusPill>{titleCase(booking.status)}</StatusPill>
                            <StatusPill>{booking.courseTitle}</StatusPill>
                            {booking.payment ? (
                              <StatusPill
                                tone={
                                  booking.payment.status === "verified"
                                    ? "primary"
                                    : "neutral"
                                }
                              >
                                Payment {titleCase(booking.payment.status)}
                              </StatusPill>
                            ) : null}
                          </View>
                        </View>
                        <View className="gap-1">
                          <Text className="text-sm text-muted-foreground">
                            {booking.studentEmail || booking.studentPhone || "No contact"}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            {booking.sessionTitle ||
                              booking.preferredDate ||
                              "No session assigned"}
                          </Text>
                          {booking.studentNote ? (
                            <Text className="text-sm leading-5 text-muted-foreground">
                              {booking.studentNote}
                            </Text>
                          ) : null}
                        </View>

                        {canMutate && booking.status === "pending_review" ? (
                          <View className="flex-row gap-2">
                            <View className="flex-1">
                              <MobileButton
                                disabled={bookingMutation.isPending}
                                onPress={() => updateBooking(booking, "approve")}
                              >
                                Approve
                              </MobileButton>
                            </View>
                            <View className="flex-1">
                              <MobileButton
                                disabled={bookingMutation.isPending}
                                variant="danger"
                                onPress={() =>
                                  confirmAction(
                                    "Reject booking",
                                    `Reject booking for ${booking.studentName || "this student"}?`,
                                    () => updateBooking(booking, "reject"),
                                  )
                                }
                              >
                                Reject
                              </MobileButton>
                            </View>
                          </View>
                        ) : null}

                        {canMutate &&
                        (booking.status === "approved" ||
                          booking.status === "scheduled") ? (
                          <View className="flex-row gap-2">
                            <View className="flex-1">
                              <MobileButton
                                disabled={bookingMutation.isPending}
                                variant="secondary"
                                onPress={() => updateBooking(booking, "complete")}
                              >
                                Complete
                              </MobileButton>
                            </View>
                            <View className="flex-1">
                              <MobileButton
                                disabled={bookingMutation.isPending}
                                variant="danger"
                                onPress={() =>
                                  confirmAction(
                                    "Cancel booking",
                                    `Cancel booking for ${booking.studentName || "this student"}?`,
                                    () => updateBooking(booking, "cancel"),
                                  )
                                }
                              >
                                Cancel
                              </MobileButton>
                            </View>
                          </View>
                        ) : null}

                        {canMutate && booking.payment ? (
                          <View className="gap-3 rounded-2xl border border-border bg-background p-3">
                            <TextInput
                              className="min-h-11 rounded-2xl border border-border bg-card px-3 text-foreground"
                              onChangeText={setReviewNotes}
                              placeholder="Payment review note"
                              placeholderTextColor="#64748b"
                              value={reviewNotes}
                            />
                            <View className="flex-row gap-2">
                              <View className="flex-1">
                                <MobileButton
                                  disabled={proofUrlMutation.isPending}
                                  variant="secondary"
                                  onPress={() => openProof(booking)}
                                >
                                  Open proof
                                </MobileButton>
                              </View>
                              <View className="flex-1">
                                <MobileButton
                                  disabled={paymentMutation.isPending}
                                  onPress={() => updatePayment(booking, "verify")}
                                >
                                  Approve payment
                                </MobileButton>
                              </View>
                            </View>
                            <MobileButton
                              disabled={paymentMutation.isPending}
                              variant="danger"
                              onPress={() =>
                                confirmAction(
                                  "Reject payment",
                                  `Reject payment for ${booking.studentName || "this student"}?`,
                                  () => updatePayment(booking, "reject"),
                                )
                              }
                            >
                              Reject payment
                            </MobileButton>
                          </View>
                        ) : null}
                      </View>
                    </MobileCard>
                  ))}
                </View>
              </MobileSection>

              <MobileSection title="Sessions">
                <View className="gap-3">
                  {workspace.sessions.isLoading ? (
                    <MobileLoadingState message="Loading sessions." />
                  ) : null}
                  {sessions.slice(0, 8).map((session) => (
                    <MobileCard key={session.id}>
                      <View className="gap-3">
                        <View className="gap-1">
                          <Text className="text-sm font-semibold text-foreground">
                            {session.title}
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            <StatusPill>{titleCase(session.status)}</StatusPill>
                            <StatusPill>{session.courseTitle}</StatusPill>
                            <StatusPill>{session.assignedBookingCount} bookings</StatusPill>
                          </View>
                        </View>
                        <Text className="text-sm text-muted-foreground">
                          {new Date(session.startsAt).toLocaleString("en-PH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </Text>
                        {canMutate && session.status === "scheduled" ? (
                          <View className="flex-row gap-2">
                            <View className="flex-1">
                              <MobileButton
                                disabled={sessionMutation.isPending}
                                variant="secondary"
                                onPress={() => updateSession(session, "complete")}
                              >
                                Complete
                              </MobileButton>
                            </View>
                            <View className="flex-1">
                              <MobileButton
                                disabled={sessionMutation.isPending}
                                variant="danger"
                                onPress={() =>
                                  confirmAction(
                                    "Cancel session",
                                    `Cancel ${session.title}?`,
                                    () => updateSession(session, "cancel"),
                                  )
                                }
                              >
                                Cancel
                              </MobileButton>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </MobileCard>
                  ))}
                  {!workspace.sessions.isLoading && sessions.length === 0 ? (
                    <MobileEmptyState
                      description="Sessions created on web will appear here."
                      title="No sessions"
                    />
                  ) : null}
                </View>
              </MobileSection>

              <MobileSection title="Courses and members">
                <View className="gap-3">
                  <MobileCard>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Courses
                      </Text>
                      {courses.slice(0, 8).map((course) => (
                        <Text className="text-sm text-muted-foreground" key={course.id}>
                          {course.title} · {titleCase(course.status)} ·{" "}
                          {course.pendingBookingCount} pending
                        </Text>
                      ))}
                      {courses.length === 0 ? (
                        <Text className="text-sm text-muted-foreground">
                          No courses yet.
                        </Text>
                      ) : null}
                    </View>
                  </MobileCard>
                  <MobileCard>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Members
                      </Text>
                      {members.slice(0, 8).map((member) => (
                        <Text className="text-sm text-muted-foreground" key={member.id}>
                          {member.displayName || member.username} ·{" "}
                          {titleCase(member.role)}
                        </Text>
                      ))}
                      {members.length === 0 ? (
                        <Text className="text-sm text-muted-foreground">
                          No members loaded.
                        </Text>
                      ) : null}
                    </View>
                  </MobileCard>
                  <MobileCard>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Payment methods
                      </Text>
                      {paymentMethods.map((method) => (
                        <Text className="text-sm text-muted-foreground" key={method.id}>
                          {method.name} · {method.isActive ? "Active" : "Inactive"}
                        </Text>
                      ))}
                      {paymentMethods.length === 0 ? (
                        <Text className="text-sm text-muted-foreground">
                          No payment methods configured.
                        </Text>
                      ) : null}
                    </View>
                  </MobileCard>
                </View>
              </MobileSection>
            </>
          ) : null}
        </>
      ) : null}
    </MobileScrollScreen>
  );
}
