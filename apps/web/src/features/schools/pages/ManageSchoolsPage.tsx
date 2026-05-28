"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
  CommunityStats,
} from "@/components/community/community-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/nextjs";
import { DEFAULT_TIMEZONE } from "@freediving.ph/config";
import type {
  Course,
  CourseBookingMode,
  CourseBookingPaymentStatus,
  CourseBookingRequest,
  CourseBookingStatus,
  CourseLocationMode,
  CourseSession,
  CourseSessionStatus,
  CreateCourseBookingRequest,
  CreateCoursePaymentMethodRequest,
  CreateCourseRequest,
  CreateCourseSessionRequest,
  CreateSchoolRequest,
  School,
  SchoolStatus,
  SessionLocationMode,
  UpdateCoursePaymentMethodRequest,
} from "@freediving.ph/types";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ExternalLink,
  Pencil,
  Plus,
  Send,
  Settings2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
import {
  PaymentMethodsSetup,
  type PaymentMethodSetupSaveValue,
} from "@/features/payments/components/PaymentMethodsSetup";
import {
  DiveSiteCombobox,
  formatDiveSiteOptionLabel,
} from "@/features/diveSpots/components/DiveSiteCombobox";
import { LocationPicker } from "@/features/locations/components";
import { useMyInstructorApplication } from "@/features/instructors";
import {
  buildDisplayLocation,
  type LocationSearchValue,
} from "@/features/locations/types/location-search";
import { dateStringToDate, dateToDateString } from "@/lib/date-picker-values";
import { applyApiErrorsToForm } from "@/lib/forms/api-errors";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { formatPeso } from "@/lib/money";
import { schoolsApi } from "../api/schools";
import {
  bookingStatusLabels,
  bookingModeLabels,
  courseLocationModeLabels,
  courseLevelLabels,
  courseStatusLabels,
  courseTypeLabels,
  paymentStatusLabels,
  schoolStatusLabels,
  sessionLocationModeLabels,
  sessionStatusLabels,
} from "../constants";
import {
  useAssignBookingSession,
  useCreateBooking,
  useCreateCourse,
  useCreatePaymentMethod,
  useCreateSchool,
  useCreateSession,
  useReviewBookingPayment,
  useSetBookingStatus,
  useSetSessionStatus,
  useUpdateCourse,
  useUpdatePaymentMethod,
  useUpdateSchool,
  useUpdateSession,
} from "../hooks/mutations";
import {
  useManageBookings,
  useManageCourses,
  useManagePaymentMethods,
  useManageSchool,
  useManageSchools,
  useManageSessions,
} from "../hooks/queries";
import {
  schoolFormSchema,
  type SchoolFormValues,
} from "../schemas/school-form.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

type Option = { value: string; label: string };
type SchoolLocationSource = NonNullable<LocationSearchValue["locationSource"]>;

function canManageSchoolOperations(school: School) {
  return (
    school.currentUserRole === "owner" || school.currentUserRole === "admin"
  );
}

function canEditSchoolSettings(school: School) {
  return school.currentUserRole === "owner";
}

const courseTypeOptions = Object.entries(courseTypeLabels).map(
  ([value, label]) => ({ value, label }),
);
const courseLevelOptions = [
  { value: "", label: "Not specified" },
  ...Object.entries(courseLevelLabels).map(([value, label]) => ({
    value,
    label,
  })),
];
const courseStatusOptions = Object.entries(courseStatusLabels).map(
  ([value, label]) => ({ value, label }),
);
const courseLocationModeOptions = Object.entries(courseLocationModeLabels).map(
  ([value, label]) => ({ value, label }),
);
const sessionStatusOptions = Object.entries(sessionStatusLabels).map(
  ([value, label]) => ({ value, label }),
);
const sessionLocationModeOptions = Object.entries(
  sessionLocationModeLabels,
).map(([value, label]) => ({ value, label }));
const bookingStatusOptions = Object.entries(bookingStatusLabels).map(
  ([value, label]) => ({ value, label }),
);
const paymentStatusOptions = Object.entries(paymentStatusLabels).map(
  ([value, label]) => ({ value, label }),
);
const schoolStatusOptions = Object.entries(schoolStatusLabels).map(
  ([value, label]) => ({ value, label }),
);

export function ManageSchoolsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const schoolsQuery = useManageSchools();
  const instructorQuery = useMyInstructorApplication();
  const createSchool = useCreateSchool();
  const [open, setOpen] = useState(false);

  if (isLoaded && !isSignedIn) {
    return <UnauthorizedState />;
  }

  const schools = schoolsQuery.data ?? [];
  const instructorStatus =
    instructorQuery.data?.application.viewerInstructorStatus;
  const canCreateSchool = instructorStatus?.canCreateSchool === true;

  async function onCreate(data: CreateSchoolRequest) {
    if (!canCreateSchool) return;
    const school = await createSchool.mutateAsync(data);
    setOpen(false);
    router.push(`/manage/schools/${school.slug}`);
  }

  return (
    <CommunityPageShell>
      <CommunityHeader
        title="Manage schools"
        subtitle="Create and manage freediving schools, courses, bookings, and sessions."
        action={
          canCreateSchool ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button size="sm">
                    <Plus />
                    Add school
                  </Button>
                }
              />
              <DialogContent className="max-w-2xl!">
                <DialogHeader>
                  <DialogTitle>Add school</DialogTitle>
                </DialogHeader>
                <SchoolForm onSubmit={onCreate} busy={createSchool.isPending} />
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/instructor/apply" />}
            >
              Apply as instructor
            </Button>
          )
        }
      />

      {schoolsQuery.isLoading ? <StateText text="Loading schools..." /> : null}
      {schoolsQuery.isError ? (
        <StateText text="Could not load schools. Check your account access." />
      ) : null}
      {!instructorQuery.isLoading && !canCreateSchool ? (
        <SchoolCreateBlockedState
          status={instructorStatus?.status ?? "none"}
          message={instructorStatus?.message}
          rejectionReason={instructorStatus?.rejectionReason}
        />
      ) : null}
      {!schoolsQuery.isLoading && schools.length === 0 ? (
        <CommunityEmptyState
          title="No schools yet"
          description={
            canCreateSchool
              ? "Register your school to start adding courses and managing bookings."
              : "School creation is available for verified instructors."
          }
          action={
            canCreateSchool ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus />
                Add school
              </Button>
            ) : (
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/instructor/apply" />}
              >
                Apply as instructor
              </Button>
            )
          }
        />
      ) : null}
      <div className="divide-y divide-border/70 border-y border-border/70">
        {schools.map((school) => (
          <div
            key={school.id}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-semibold">
                  {school.name}
                </h2>
                <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                  {schoolStatusLabels[school.status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {school.baseLocation || "No base location yet"}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{school.courseCount} courses</span>
                <span>{school.upcomingSessionCount} upcoming sessions</span>
                <span>{school.pendingBookingCount} pending bookings</span>
              </div>
            </div>
            <Button
              className="self-start"
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/manage/schools/${school.slug}`} />}
            >
              Open
            </Button>
          </div>
        ))}
      </div>
    </CommunityPageShell>
  );
}

export function ManageSchoolOverviewPage({ slug }: { slug: string }) {
  const schoolQuery = useManageSchool(slug);
  const school = schoolQuery.data;

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <PageState text="Loading school..." />;

  return (
    <SchoolShell school={school}>
      <CommunityStats
        items={[
          { label: "Courses", value: String(school.courseCount) },
          { label: "Published", value: String(school.publishedCourseCount) },
          { label: "Pending", value: String(school.pendingBookingCount) },
          { label: "Upcoming", value: String(school.upcomingSessionCount) },
          { label: "Payments", value: String(school.paymentsToReviewCount) },
        ]}
      />
      {school.status === "draft" ? (
        <Alert>
          <AlertTitle>This school is not public yet.</AlertTitle>
          <AlertDescription>
            Publish the school when its profile is ready. Published schools can
            appear in the public school directory.
          </AlertDescription>
        </Alert>
      ) : null}
    </SchoolShell>
  );
}

export function ManageSchoolSettingsPage({ slug }: { slug: string }) {
  const schoolQuery = useManageSchool(slug);
  const updateSchool = useUpdateSchool(slug);
  const [editing, setEditing] = useState(false);
  const school = schoolQuery.data;
  const canEditSchool = school ? canEditSchoolSettings(school) : false;

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <PageState text="Loading school..." />;

  return (
    <SchoolShell
      school={school}
      active="settings"
      action={
        canEditSchool ? (
          <>
            {school.status === "draft" ? (
              <Button
                size="sm"
                onClick={() => updateSchool.mutate({ status: "published" })}
                disabled={updateSchool.isPending}
              >
                <Check />
                Publish school
              </Button>
            ) : null}
            {school.status === "published" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSchool.mutate({ status: "draft" })}
                disabled={updateSchool.isPending}
              >
                <X />
                Move to draft
              </Button>
            ) : null}
            <Dialog open={editing} onOpenChange={setEditing}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                tooltip="Edit school"
                aria-label="Edit school"
                onClick={() => setEditing(true)}
              >
                <Pencil />
              </Button>
              <DialogContent className="max-w-2xl!">
                <DialogHeader>
                  <DialogTitle>Edit school</DialogTitle>
                </DialogHeader>
                <EditSchoolForm
                  school={school}
                  onDone={() => setEditing(false)}
                />
              </DialogContent>
            </Dialog>
          </>
        ) : null
      }
    >
      <Toolbar
        title="Settings"
        subtitle="Manage the school profile, publication state, and payment setup."
        action={null}
      />
      {canEditSchool ? (
        <>
          {school.status === "draft" ? (
            <Alert>
              <AlertTitle>This school is not public yet.</AlertTitle>
              <AlertDescription>
                Publish the school when its profile is ready. Published schools
                can appear in the public school directory.
              </AlertDescription>
            </Alert>
          ) : null}
          <SchoolPaymentMethodsPanel slug={slug} schoolId={school.id} />
        </>
      ) : (
        <CommunityEmptyState
          title="Owner settings only"
          description="Only the school owner can update school settings and payment setup."
        />
      )}
    </SchoolShell>
  );
}

export function ManageCoursesPage({ slug }: { slug: string }) {
  const schoolQuery = useManageSchool(slug);
  const coursesQuery = useManageCourses(slug);
  const createCourse = useCreateCourse(slug);
  const [open, setOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const school = schoolQuery.data;
  const courses = coursesQuery.data ?? [];
  const canManage = school ? canManageSchoolOperations(school) : false;

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <PageState text="Loading school..." />;

  return (
    <SchoolShell school={school} active="courses">
      <Toolbar
        title="Courses"
        action={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button size="sm">
                    <Plus />
                    Add course
                  </Button>
                }
              />
              <DialogContent className="max-w-3xl!">
                <DialogHeader>
                  <DialogTitle>Add course</DialogTitle>
                </DialogHeader>
                <CourseForm
                  school={school}
                  onSubmit={async (data) => {
                    await createCourse.mutateAsync(data);
                    setOpen(false);
                  }}
                  busy={createCourse.isPending}
                />
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <div className="divide-y divide-border/70 border-y border-border/70">
        {courses.map((course) => (
          <div key={course.id} className="py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{course.title}</h2>
                  <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                    {courseStatusLabels[course.status]}
                  </Badge>
                  <Badge variant="outline" className="h-5 px-2 text-[11px]">
                    {courseTypeLabels[course.courseType]}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {course.shortDescription || "No short description yet"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {course.paymentRequired
                      ? formatPeso(course.priceAmount ?? 0)
                      : "No payment required"}
                  </span>
                  <span>
                    {course.approvalRequired
                      ? "Approval required"
                      : "Auto-approval allowed"}
                  </span>
                  <span>{courseBookingOptionsLabel(course)}</span>
                  <span>
                    {courseLocationLabel(course, school)} ·{" "}
                    {courseLocationHelper(course)}
                  </span>
                  {course.locationNote ? (
                    <span>{course.locationNote}</span>
                  ) : null}
                  <span>{course.upcomingSessionCount} upcoming sessions</span>
                  <span>{course.pendingBookingCount} pending bookings</span>
                </div>
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setEditCourse(course)}
                  >
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    nativeButton={false}
                    render={<Link href={`/manage/schools/${slug}/sessions`} />}
                  >
                    <CalendarPlus />
                    Create session
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {courses.length === 0 ? (
        <CommunityEmptyState
          title="No courses yet"
          description="Add a course before publishing schedules or accepting bookings."
        />
      ) : null}
      <Dialog
        open={editCourse != null}
        onOpenChange={(next) => !next && setEditCourse(null)}
      >
        <DialogContent className="max-w-3xl!">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
          </DialogHeader>
          {editCourse ? (
            <EditCourseForm
              school={school}
              course={editCourse}
              onDone={() => setEditCourse(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </SchoolShell>
  );
}

export function ManageSessionsPage({ slug }: { slug: string }) {
  const schoolQuery = useManageSchool(slug);
  const coursesQuery = useManageCourses(slug);
  const [status, setStatus] = useState("");
  const filters = useMemo(
    () => ({ status: status as CourseSessionStatus | undefined }),
    [status],
  );
  const sessionsQuery = useManageSessions(slug, filters);
  const createSession = useCreateSession(slug);
  const setSessionStatus = useSetSessionStatus(slug);
  const [open, setOpen] = useState(false);
  const [editSession, setEditSession] = useState<CourseSession | null>(null);
  const school = schoolQuery.data;
  const courses = coursesQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const canManage = school ? canManageSchoolOperations(school) : false;

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <PageState text="Loading school..." />;

  return (
    <SchoolShell school={school} active="sessions">
      <Toolbar
        title="Sessions"
        subtitle="Create sessions so students can book available course dates."
        action={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button size="sm">
                    <Plus />
                    Add session
                  </Button>
                }
              />
              <DialogContent className="max-w-3xl!">
                <DialogHeader>
                  <DialogTitle>Add session</DialogTitle>
                </DialogHeader>
                <SessionForm
                  school={school}
                  courses={courses}
                  onSubmit={async (data) => {
                    await createSession.mutateAsync(data);
                    setOpen(false);
                  }}
                  busy={createSession.isPending}
                />
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            ...sessionStatusOptions,
          ]}
        />
      </div>
      <div className="divide-y divide-border/70 border-y border-border/70">
        {sessions.map((session) => (
          <div key={session.id} className="py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{session.title}</h2>
                  <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                    {sessionStatusLabels[session.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.courseTitle} • {formatDateTime(session.startsAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {sessionLocationLabel(session, courses, school)} ·{" "}
                    {sessionLocationHelper(session)}
                  </span>
                  {session.locationNote ? (
                    <span>{session.locationNote}</span>
                  ) : null}
                  <span>
                    {session.capacity
                      ? `${Math.max(session.capacity - session.assignedBookingCount, 0)} slots left`
                      : "Open capacity"}
                  </span>
                  {session.capacity &&
                    session.assignedBookingCount >= session.capacity ? (
                    <span>Full</span>
                  ) : null}
                  <span>
                    {session.instructorDisplayName || "No instructor assigned"}
                  </span>
                </div>
              </div>
              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setEditSession(session)}
                  >
                    <Pencil />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={session.status !== "scheduled"}
                    onClick={() =>
                      setSessionStatus.mutate({
                        sessionId: session.id,
                        action: "complete",
                      })
                    }
                  >
                    <Check />
                    Complete
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={
                      session.status === "cancelled" ||
                      session.status === "completed"
                    }
                    onClick={() =>
                      setSessionStatus.mutate({
                        sessionId: session.id,
                        action: "cancel",
                      })
                    }
                  >
                    <X />
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {sessions.length === 0 ? (
        <CommunityEmptyState
          title="No sessions match"
          description="Scheduled course sessions will appear here."
        />
      ) : null}
      <Dialog
        open={editSession != null}
        onOpenChange={(next) => !next && setEditSession(null)}
      >
        <DialogContent className="max-w-3xl!">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
          </DialogHeader>
          {editSession ? (
            <EditSessionForm
              school={school}
              courses={courses}
              session={editSession}
              onDone={() => setEditSession(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </SchoolShell>
  );
}

export function ManageBookingsPage({ slug }: { slug: string }) {
  const schoolQuery = useManageSchool(slug);
  const coursesQuery = useManageCourses(slug);
  const sessionsQuery = useManageSessions(slug);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [bookingMode, setBookingMode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const filters = useMemo(
    () => ({
      status: status as CourseBookingStatus | undefined,
      paymentStatus: paymentStatus as CourseBookingPaymentStatus | undefined,
      bookingMode: bookingMode as CourseBookingMode | undefined,
      sessionId,
    }),
    [status, paymentStatus, bookingMode, sessionId],
  );
  const bookingsQuery = useManageBookings(slug, filters);
  const createBooking = useCreateBooking(slug);
  const setBookingStatus = useSetBookingStatus(slug);
  const assignBookingSession = useAssignBookingSession(slug);
  const reviewPayment = useReviewBookingPayment(slug);
  const [open, setOpen] = useState(false);
  const school = schoolQuery.data;
  const courses = coursesQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const canManage = school ? canManageSchoolOperations(school) : false;

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <PageState text="Loading school..." />;

  return (
    <SchoolShell school={school} active="bookings">
      <Toolbar
        title="Booking requests"
        subtitle="Review requests, assign sessions, and keep payment review separate from booking status."
        action={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button size="sm">
                    <Plus />
                    Add booking
                  </Button>
                }
              />
              <DialogContent className="max-w-2xl!">
                <DialogHeader>
                  <DialogTitle>Add booking</DialogTitle>
                </DialogHeader>
                <BookingForm
                  courses={courses}
                  onSubmit={async (data) => {
                    await createBooking.mutateAsync(data);
                    setOpen(false);
                  }}
                  busy={createBooking.isPending}
                />
              </DialogContent>
            </Dialog>
          ) : null
        }
      />
      <CommunityStats
        className="grid-cols-2 sm:grid-cols-5"
        items={[
          {
            label: "Pending",
            value: String(
              bookings.filter((b) => b.status === "pending_review").length,
            ),
          },
          {
            label: "Approved",
            value: String(
              bookings.filter((b) => b.status === "approved").length,
            ),
          },
          {
            label: "Scheduled",
            value: String(
              bookings.filter((b) => b.status === "scheduled").length,
            ),
          },
          {
            label: "Payments",
            value: String(
              bookings.filter((b) => b.payment?.status === "submitted").length,
            ),
          },
          {
            label: "Completed",
            value: String(
              bookings.filter((b) => b.status === "completed").length,
            ),
          },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Booking mode"
          value={bookingMode}
          onChange={setBookingMode}
          options={[
            { value: "", label: "All booking modes" },
            { value: "session", label: "Schedule selected" },
            { value: "preferred_date", label: "Preferred date request" },
          ]}
        />
        <SelectField
          label="Session"
          value={sessionId}
          onChange={setSessionId}
          options={[
            { value: "", label: "All sessions" },
            ...sessions.map((session) => ({
              value: session.id,
              label: session.title,
            })),
          ]}
        />
        <SelectField
          label="Booking status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            ...bookingStatusOptions,
          ]}
        />
        <SelectField
          label="Payment status"
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={[
            { value: "", label: "All payments" },
            ...paymentStatusOptions,
          ]}
        />
      </div>
      <div className="divide-y divide-border/70 border-y border-border/70">
        {bookings.map((booking) => (
          <BookingRow
            key={booking.id}
            slug={slug}
            booking={booking}
            sessions={sessions.filter((s) => s.courseId === booking.courseId)}
            onAction={(action) =>
              setBookingStatus.mutate({ bookingId: booking.id, action })
            }
            onAssign={(sessionId) =>
              assignBookingSession.mutate({ bookingId: booking.id, sessionId })
            }
            onReviewPayment={(action) =>
              reviewPayment.mutate({ bookingId: booking.id, action })
            }
            canManage={canManage}
          />
        ))}
      </div>
      {bookings.length === 0 ? (
        <CommunityEmptyState
          title="No bookings match"
          description="Booking requests will appear here once students start submitting."
        />
      ) : null}
    </SchoolShell>
  );
}

function SchoolShell({
  school,
  active,
  action,
  children,
}: {
  school: School;
  active?: "courses" | "bookings" | "sessions" | "settings";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const activeTab = active ?? "overview";

  const onTabChange = (value: string) => {
    const baseHref = `/manage/schools/${school.slug}`;
    if (value === "overview") {
      router.push(baseHref);
      return;
    }
    router.push(`${baseHref}/${value}`);
  };

  return (
    <CommunityPageShell>
      <CommunityHeader
        title={school.name}
        subtitle={school.shortDescription || "No school description yet."}
        navigation={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/manage/schools" />}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Manage schools
          </Button>
        }
        action={
          <>
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
              {schoolStatusLabels[school.status]}
            </Badge>
            {action}
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          {school.baseLocation || "No base location set"}
        </p>
      </CommunityHeader>
      <Tabs value={activeTab} onValueChange={onTabChange} className="gap-0">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
    </CommunityPageShell>
  );
}

function SchoolForm({
  onSubmit,
  busy,
  initial,
  showStatus = false,
}: {
  onSubmit: (data: CreateSchoolRequest) => Promise<void>;
  busy: boolean;
  initial?: School;
  showStatus?: boolean;
}) {
  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: getSchoolFormDefaultValues(initial),
  });
  const [formError, setFormError] = useState("");
  const [diveSiteLabel, setDiveSiteLabel] = useState(
    initial?.diveSiteName ?? "",
  );
  const formValues = form.watch();
  const locationValue: LocationSearchValue = {
    locationName: formValues.baseLocationLabel ?? formValues.baseLocation ?? "",
    formattedAddress: formValues.formattedAddress ?? "",
    regionCode: formValues.regionCode ?? "",
    regionName: formValues.regionName ?? "",
    provinceCode: formValues.provinceCode ?? "",
    provinceName: formValues.provinceName ?? "",
    cityCode: formValues.cityCode ?? "",
    cityName: formValues.cityName ?? "",
    barangayCode: formValues.barangayCode ?? "",
    barangayName: formValues.barangayName ?? "",
    locationSource: normalizeLocationSource(formValues.locationSource),
  };

  async function handleSubmit(values: SchoolFormValues) {
    setFormError("");
    try {
      await onSubmit(values);
    } catch (error) {
      const result = applyApiErrorsToForm(form, error, {
        fieldMap: schoolApiFieldMap,
        fallbackMessage: "Could not save school",
      });
      if (result.globalMessages.length > 0) {
        setFormError(result.globalMessages.join("\n"));
      }
    }
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        {formError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="organization" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {showStatus ? (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School status</FormLabel>
                <Select
                  items={schoolStatusLabels}
                  value={field.value ?? "draft"}
                  onValueChange={(status) =>
                    field.onChange((status ?? "draft") as SchoolStatus)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {schoolStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Published schools can appear in the public school directory.
                  Draft schools stay private to school managers.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <FormField
          control={form.control}
          name="shortDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="baseLocation"
          render={() => (
            <FormItem>
              <FormLabel>Base location</FormLabel>
              <LocationPicker
                value={locationValue}
                onChange={(location) => {
                  const locationLabel = buildDisplayLocation(location);
                  form.setValue("baseLocation", locationLabel, {
                    shouldDirty: true,
                  });
                  form.setValue("baseLocationLabel", locationLabel, {
                    shouldDirty: true,
                  });
                  form.setValue(
                    "formattedAddress",
                    location.formattedAddress ?? "",
                    { shouldDirty: true },
                  );
                  form.setValue("regionCode", location.regionCode ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue("regionName", location.regionName ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue("provinceCode", location.provinceCode ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue("provinceName", location.provinceName ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue("cityCode", location.cityCode ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue("cityName", location.cityName ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue("barangayCode", location.barangayCode ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue("barangayName", location.barangayName ?? "", {
                    shouldDirty: true,
                  });
                  form.setValue(
                    "locationSource",
                    location.locationSource ?? "manual",
                    { shouldDirty: true },
                  );
                }}
                disabled={busy}
                mode="place"
                compact
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="diveSiteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Optional dive site</FormLabel>
              <DiveSiteCombobox
                value={field.value ?? ""}
                valueLabel={diveSiteLabel}
                onValueChange={(diveSiteId, site) => {
                  field.onChange(diveSiteId);
                  setDiveSiteLabel(site ? formatDiveSiteOptionLabel(site) : "");
                }}
                searchPlaceholder="Link a dive site"
                allOption={{ value: "", label: "No dive site" }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact email</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="email" type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="websiteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input {...field} type="url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="facebookUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook</FormLabel>
                <FormControl>
                  <Input {...field} type="url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="instagramUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <FormControl>
                  <Input {...field} type="url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={busy || form.formState.isSubmitting}>
          <Send />
          Save school
        </Button>
      </form>
    </Form>
  );
}

const schoolApiFieldMap = {
  contact_email: "contactEmail",
  website_url: "websiteUrl",
  facebook_url: "facebookUrl",
  instagram_url: "instagramUrl",
} satisfies Record<string, keyof SchoolFormValues>;

function getSchoolFormDefaultValues(initial?: School): SchoolFormValues {
  return {
    name: initial?.name ?? "",
    shortDescription: initial?.shortDescription ?? "",
    descriptionMarkdown: initial?.descriptionMarkdown ?? "",
    baseLocation: initial?.baseLocation ?? "",
    baseLocationLabel:
      initial?.baseLocationLabel ?? initial?.baseLocation ?? "",
    formattedAddress: initial?.formattedAddress ?? "",
    regionCode: initial?.regionCode ?? "",
    regionName: initial?.regionName ?? "",
    provinceCode: initial?.provinceCode ?? "",
    provinceName: initial?.provinceName ?? "",
    cityCode: initial?.cityCode ?? "",
    cityName: initial?.cityName ?? "",
    barangayCode: initial?.barangayCode ?? "",
    barangayName: initial?.barangayName ?? "",
    locationSource: initial?.locationSource ?? "manual",
    diveSiteId: initial?.diveSiteId ?? "",
    contactEmail: initial?.contactEmail ?? "",
    contactPhone: initial?.contactPhone ?? "",
    websiteUrl: initial?.websiteUrl ?? "",
    facebookUrl: initial?.facebookUrl ?? "",
    instagramUrl: initial?.instagramUrl ?? "",
    status: initial?.status ?? "draft",
  };
}

function normalizeLocationSource(value?: string): SchoolLocationSource {
  if (
    value === "psgc" ||
    value === "google_places" ||
    value === "psgc_mapped" ||
    value === "unmapped"
  ) {
    return value;
  }
  return "manual";
}

function getLocationSearchValue(item: {
  locationLabel?: string;
  formattedAddress?: string;
  regionCode?: string;
  regionName?: string;
  provinceCode?: string;
  provinceName?: string;
  cityCode?: string;
  cityName?: string;
  barangayCode?: string;
  barangayName?: string;
  locationSource?: string;
}): LocationSearchValue {
  return {
    locationName: item.locationLabel ?? "",
    formattedAddress: item.formattedAddress ?? "",
    regionCode: item.regionCode ?? "",
    regionName: item.regionName ?? "",
    provinceCode: item.provinceCode ?? "",
    provinceName: item.provinceName ?? "",
    cityCode: item.cityCode ?? "",
    cityName: item.cityName ?? "",
    barangayCode: item.barangayCode ?? "",
    barangayName: item.barangayName ?? "",
    locationSource: normalizeLocationSource(item.locationSource),
  };
}

function locationFieldsFromSearch(value: LocationSearchValue) {
  return {
    locationLabel: buildDisplayLocation(value),
    formattedAddress: value.formattedAddress ?? "",
    regionCode: value.regionCode ?? "",
    regionName: value.regionName ?? "",
    provinceCode: value.provinceCode ?? "",
    provinceName: value.provinceName ?? "",
    cityCode: value.cityCode ?? "",
    cityName: value.cityName ?? "",
    barangayCode: value.barangayCode ?? "",
    barangayName: value.barangayName ?? "",
    locationSource: value.locationSource ?? "manual",
  };
}

function schoolLocationLabel(school: School) {
  return (
    school.baseLocationLabel ||
    school.formattedAddress ||
    school.baseLocation ||
    "No school location set"
  );
}

function courseLocationLabel(course: Course, school: School) {
  if (course.locationMode === "structured") {
    return course.locationLabel || course.formattedAddress || "Course location";
  }
  if (course.locationMode === "text_only") {
    return course.locationLabel || "Text-only location";
  }
  return schoolLocationLabel(school);
}

function courseLocationHelper(course: Course) {
  if (course.locationMode === "structured") {
    return "Uses a course location";
  }
  if (course.locationMode === "text_only") {
    return "Text-only location";
  }
  return "Uses school location";
}

function courseBookingOptionsLabel(course: Course) {
  if (course.allowSessionBooking && course.allowPreferredDateRequest) {
    return "Schedules + preferred date";
  }
  if (course.allowSessionBooking) return "Available schedules";
  if (course.allowPreferredDateRequest) return "Preferred date";
  return "Bookings off";
}

function sessionLocationLabel(
  session: CourseSession,
  courses: Course[],
  school: School,
) {
  if (session.locationMode === "structured") {
    return (
      session.locationLabel || session.formattedAddress || "Session location"
    );
  }
  if (session.locationMode === "text_only") {
    return session.locationLabel || "Text-only location";
  }
  if (session.locationMode === "inherit_school") {
    return schoolLocationLabel(school);
  }
  const course = courses.find((item) => item.id === session.courseId);
  return course
    ? courseLocationLabel(course, school)
    : schoolLocationLabel(school);
}

function sessionLocationHelper(session: CourseSession) {
  if (session.locationMode === "structured") {
    return "Uses a session location";
  }
  if (session.locationMode === "text_only") {
    return "Text-only location";
  }
  if (session.locationMode === "inherit_school") {
    return "Uses school location";
  }
  return "Uses course location";
}

function EditSchoolForm({
  school,
  onDone,
}: {
  school: School;
  onDone: () => void;
}) {
  const updateSchool = useUpdateSchool(school.slug);
  return (
    <SchoolForm
      initial={school}
      showStatus
      busy={updateSchool.isPending}
      onSubmit={async (data) => {
        await updateSchool.mutateAsync(data);
        onDone();
      }}
    />
  );
}

function CourseForm({
  school,
  onSubmit,
  busy,
  initial,
}: {
  school: School;
  onSubmit: (data: CreateCourseRequest) => Promise<void>;
  busy: boolean;
  initial?: Course;
}) {
  const [form, setForm] = useState<CreateCourseRequest>({
    title: initial?.title ?? "",
    shortDescription: initial?.shortDescription ?? "",
    descriptionMarkdown: initial?.descriptionMarkdown ?? "",
    courseType: initial?.courseType ?? "custom",
    level: initial?.level ?? "",
    durationLabel: initial?.durationLabel ?? "",
    priceAmount: initial?.priceAmount ?? null,
    paymentRequired: initial?.paymentRequired ?? false,
    approvalRequired: initial?.approvalRequired ?? true,
    allowSessionBooking: initial?.allowSessionBooking ?? false,
    allowPreferredDateRequest: initial?.allowPreferredDateRequest ?? true,
    locationMode: initial?.locationMode ?? "inherit_school",
    locationLabel: initial?.locationLabel ?? "",
    locationNote: initial?.locationNote ?? "",
    formattedAddress: initial?.formattedAddress ?? "",
    regionCode: initial?.regionCode ?? "",
    regionName: initial?.regionName ?? "",
    provinceCode: initial?.provinceCode ?? "",
    provinceName: initial?.provinceName ?? "",
    cityCode: initial?.cityCode ?? "",
    cityName: initial?.cityName ?? "",
    barangayCode: initial?.barangayCode ?? "",
    barangayName: initial?.barangayName ?? "",
    locationSource: initial?.locationSource ?? "manual",
    diveSiteId: initial?.diveSiteId ?? "",
    includedMarkdown: initial?.includedMarkdown ?? "",
    prerequisitesMarkdown: initial?.prerequisitesMarkdown ?? "",
    equipmentMarkdown: initial?.equipmentMarkdown ?? "",
    cancellationPolicyMarkdown: initial?.cancellationPolicyMarkdown ?? "",
    availabilityNote: initial?.availabilityNote ?? "",
    status: initial?.status ?? "draft",
  });
  const [diveSiteLabel, setDiveSiteLabel] = useState("");
  function setLocationMode(locationMode: CourseLocationMode) {
    setForm({
      ...form,
      locationMode,
      locationLabel:
        locationMode === "inherit_school" ? "" : form.locationLabel,
      formattedAddress:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.formattedAddress,
      regionCode:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.regionCode,
      regionName:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.regionName,
      provinceCode:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.provinceCode,
      provinceName:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.provinceName,
      cityCode:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.cityCode,
      cityName:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.cityName,
      barangayCode:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.barangayCode,
      barangayName:
        locationMode === "inherit_school" || locationMode === "text_only"
          ? ""
          : form.barangayName,
      locationSource: "manual",
    });
  }
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
    >
      <TextField
        label="Title"
        value={form.title}
        onChange={(title) => setForm({ ...form, title })}
        required
      />
      <TextField
        label="Short description"
        value={form.shortDescription}
        onChange={(shortDescription) => setForm({ ...form, shortDescription })}
      />
      <MarkdownEditor
        value={form.descriptionMarkdown}
        onChange={(descriptionMarkdown) =>
          setForm({ ...form, descriptionMarkdown })
        }
        placeholder="Course description"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="Course type"
          value={form.courseType}
          onChange={(courseType) =>
            setForm({
              ...form,
              courseType: courseType as CreateCourseRequest["courseType"],
            })
          }
          options={courseTypeOptions}
        />
        <SelectField
          label="Level"
          value={form.level}
          onChange={(level) =>
            setForm({ ...form, level: level as CreateCourseRequest["level"] })
          }
          options={courseLevelOptions}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(status) =>
            setForm({
              ...form,
              status: status as CreateCourseRequest["status"],
            })
          }
          options={courseStatusOptions}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Duration"
          value={form.durationLabel}
          onChange={(durationLabel) => setForm({ ...form, durationLabel })}
        />
        <TextField
          label="Price"
          type="number"
          value={form.priceAmount?.toString() ?? ""}
          onChange={(value) =>
            setForm({ ...form, priceAmount: value ? Number(value) : null })
          }
        />
      </div>
      <div className="grid gap-3 rounded-lg border border-border/70 p-3">
        <div className="grid gap-1">
          <Label>Location</Label>
          <p className="text-xs text-muted-foreground">
            Most courses use the school location. Change this only if this
            course happens somewhere else.
          </p>
        </div>
        <SelectField
          label="Location setup"
          value={form.locationMode}
          onChange={(locationMode) =>
            setLocationMode(locationMode as CourseLocationMode)
          }
          options={courseLocationModeOptions}
        />
        {form.locationMode === "inherit_school" ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {schoolLocationLabel(school)} · Uses school location
          </p>
        ) : null}
        {form.locationMode === "structured" ? (
          <div className="grid gap-3">
            <LocationPicker
              value={getLocationSearchValue(form)}
              onChange={(value) =>
                setForm({ ...form, ...locationFieldsFromSearch(value) })
              }
              mode="hybrid"
            />
            <div className="grid gap-2">
              <Label>Optional dive site</Label>
              <DiveSiteCombobox
                value={form.diveSiteId}
                valueLabel={diveSiteLabel}
                onValueChange={(diveSiteId, option) => {
                  setForm({ ...form, diveSiteId });
                  setDiveSiteLabel(
                    option ? formatDiveSiteOptionLabel(option) : "",
                  );
                }}
                allOption={{ value: "", label: "No dive site" }}
              />
            </div>
          </div>
        ) : null}
        {form.locationMode === "text_only" ? (
          <TextField
            label="Location label"
            value={form.locationLabel}
            onChange={(locationLabel) => setForm({ ...form, locationLabel })}
            required
          />
        ) : null}
        <TextField
          label="Location note"
          value={form.locationNote}
          onChange={(locationNote) => setForm({ ...form, locationNote })}
        />
        <p className="text-xs text-muted-foreground">
          Use a note for meeting instructions, room names, pool lanes, or pickup
          details.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.paymentRequired}
            onChange={(e) =>
              setForm({ ...form, paymentRequired: e.target.checked })
            }
          />{" "}
          Payment required
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.approvalRequired}
            onChange={(e) =>
              setForm({ ...form, approvalRequired: e.target.checked })
            }
          />{" "}
          Approval required
        </label>
      </div>
      <div className="grid gap-3 rounded-lg border border-border/70 p-3">
        <div className="grid gap-1">
          <Label>Booking options</Label>
          <p className="text-xs text-muted-foreground">
            Published courses need at least one way for students to book.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={form.allowSessionBooking}
            onChange={(e) =>
              setForm({ ...form, allowSessionBooking: e.target.checked })
            }
          />
          <span>
            Students can choose from available schedules
            <span className="block text-xs text-muted-foreground">
              Students book one of the sessions you create.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-1"
            type="checkbox"
            checked={form.allowPreferredDateRequest}
            onChange={(e) =>
              setForm({
                ...form,
                allowPreferredDateRequest: e.target.checked,
              })
            }
          />
          <span>
            Students can request a preferred date
            <span className="block text-xs text-muted-foreground">
              Students suggest a date and you assign a session later.
            </span>
          </span>
        </label>
        {form.allowSessionBooking ? (
          <p className="text-xs text-muted-foreground">
            Create sessions so students have schedules to choose from.
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={busy}>
        <Send />
        Save course
      </Button>
    </form>
  );
}

function EditCourseForm({
  school,
  course,
  onDone,
}: {
  school: School;
  course: Course;
  onDone: () => void;
}) {
  const updateCourse = useUpdateCourse(school.slug, course.id);
  return (
    <CourseForm
      school={school}
      initial={course}
      busy={updateCourse.isPending}
      onSubmit={async (data) => {
        await updateCourse.mutateAsync(data);
        onDone();
      }}
    />
  );
}

function SessionForm({
  school,
  courses,
  onSubmit,
  busy,
  initial,
}: {
  school: School;
  courses: Course[];
  onSubmit: (data: CreateCourseSessionRequest) => Promise<void>;
  busy: boolean;
  initial?: CourseSession;
}) {
  const firstCourse = initial?.courseId ?? courses[0]?.id ?? "";
  const initialCourse =
    courses.find((course) => course.id === firstCourse) ?? courses[0];
  const firstCourseMode =
    initialCourse?.locationMode === "structured" ||
      initialCourse?.locationMode === "text_only"
      ? "inherit_course"
      : "inherit_school";
  const [form, setForm] = useState<CreateCourseSessionRequest>({
    courseId: firstCourse,
    title: initial?.title ?? "",
    startsAt: initial ? toDateTimeLocal(initial.startsAt) : "",
    endsAt: initial ? toDateTimeLocal(initial.endsAt) : "",
    locationMode: initial?.locationMode ?? firstCourseMode,
    locationLabel: initial?.locationLabel ?? "",
    locationNote: initial?.locationNote ?? "",
    formattedAddress: initial?.formattedAddress ?? "",
    regionCode: initial?.regionCode ?? "",
    regionName: initial?.regionName ?? "",
    provinceCode: initial?.provinceCode ?? "",
    provinceName: initial?.provinceName ?? "",
    cityCode: initial?.cityCode ?? "",
    cityName: initial?.cityName ?? "",
    barangayCode: initial?.barangayCode ?? "",
    barangayName: initial?.barangayName ?? "",
    locationSource: initial?.locationSource ?? "manual",
    diveSiteId: initial?.diveSiteId ?? "",
    instructorUserId: initial?.instructorUserId ?? "",
    capacity: initial?.capacity ?? null,
    status: initial?.status ?? "draft",
    notesMarkdown: initial?.notesMarkdown ?? "",
  });
  const selectedCourse = courses.find((course) => course.id === form.courseId);
  const [diveSiteLabel, setDiveSiteLabel] = useState("");
  function setLocationMode(locationMode: SessionLocationMode) {
    setForm({
      ...form,
      locationMode,
      locationLabel:
        locationMode === "inherit_course" || locationMode === "inherit_school"
          ? ""
          : form.locationLabel,
      formattedAddress:
        locationMode === "structured" ? form.formattedAddress : "",
      regionCode: locationMode === "structured" ? form.regionCode : "",
      regionName: locationMode === "structured" ? form.regionName : "",
      provinceCode: locationMode === "structured" ? form.provinceCode : "",
      provinceName: locationMode === "structured" ? form.provinceName : "",
      cityCode: locationMode === "structured" ? form.cityCode : "",
      cityName: locationMode === "structured" ? form.cityName : "",
      barangayCode: locationMode === "structured" ? form.barangayCode : "",
      barangayName: locationMode === "structured" ? form.barangayName : "",
      locationSource: "manual",
    });
  }
  function setCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId);
    const locationMode =
      course?.locationMode === "structured" ||
        course?.locationMode === "text_only"
        ? "inherit_course"
        : "inherit_school";
    setForm({ ...form, courseId, locationMode });
  }
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          ...form,
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt),
        });
      }}
    >
      <SelectField
        label="Course"
        value={form.courseId}
        onChange={setCourse}
        options={courses.map((c) => ({ value: c.id, label: c.title }))}
      />
      <TextField
        label="Title"
        value={form.title}
        onChange={(title) => setForm({ ...form, title })}
        required
      />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="Starts"
          type="datetime-local"
          value={form.startsAt}
          onChange={(startsAt) => setForm({ ...form, startsAt })}
          required
        />
        <TextField
          label="Ends"
          type="datetime-local"
          value={form.endsAt}
          onChange={(endsAt) => setForm({ ...form, endsAt })}
          required
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(status) =>
            setForm({
              ...form,
              status: status as CreateCourseSessionRequest["status"],
            })
          }
          options={sessionStatusOptions}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Capacity"
          type="number"
          value={form.capacity?.toString() ?? ""}
          onChange={(value) =>
            setForm({ ...form, capacity: value ? Number(value) : null })
          }
        />
      </div>
      <div className="grid gap-3 rounded-lg border border-border/70 p-3">
        <div className="grid gap-1">
          <Label>Location</Label>
          <p className="text-xs text-muted-foreground">
            Sessions normally use the course location, then fall back to the
            school location.
          </p>
        </div>
        <SelectField
          label="Location setup"
          value={form.locationMode}
          onChange={(locationMode) =>
            setLocationMode(locationMode as SessionLocationMode)
          }
          options={sessionLocationModeOptions}
        />
        {form.locationMode === "inherit_course" ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {selectedCourse
              ? courseLocationLabel(selectedCourse, school)
              : schoolLocationLabel(school)}{" "}
            · Uses course location
          </p>
        ) : null}
        {form.locationMode === "inherit_school" ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {schoolLocationLabel(school)} · Uses school location
          </p>
        ) : null}
        {form.locationMode === "structured" ? (
          <div className="grid gap-3">
            <LocationPicker
              value={getLocationSearchValue(form)}
              onChange={(value) =>
                setForm({ ...form, ...locationFieldsFromSearch(value) })
              }
              mode="hybrid"
            />
            <div className="grid gap-2">
              <Label>Optional dive site</Label>
              <DiveSiteCombobox
                value={form.diveSiteId}
                valueLabel={diveSiteLabel}
                onValueChange={(diveSiteId, option) => {
                  setForm({ ...form, diveSiteId });
                  setDiveSiteLabel(
                    option ? formatDiveSiteOptionLabel(option) : "",
                  );
                }}
                allOption={{ value: "", label: "No dive site" }}
              />
            </div>
          </div>
        ) : null}
        {form.locationMode === "text_only" ? (
          <TextField
            label="Location label"
            value={form.locationLabel}
            onChange={(locationLabel) => setForm({ ...form, locationLabel })}
            required
          />
        ) : null}
        <TextField
          label="Location note"
          value={form.locationNote}
          onChange={(locationNote) => setForm({ ...form, locationNote })}
        />
      </div>
      <MarkdownEditor
        value={form.notesMarkdown}
        onChange={(notesMarkdown) => setForm({ ...form, notesMarkdown })}
        placeholder="Session notes"
        minRows={5}
      />
      <Button type="submit" disabled={busy || !form.courseId}>
        <Send />
        Save session
      </Button>
    </form>
  );
}

function EditSessionForm({
  school,
  courses,
  session,
  onDone,
}: {
  school: School;
  courses: Course[];
  session: CourseSession;
  onDone: () => void;
}) {
  const updateSession = useUpdateSession(school.slug, session.id);
  return (
    <SessionForm
      school={school}
      courses={courses}
      initial={session}
      busy={updateSession.isPending}
      onSubmit={async (data) => {
        await updateSession.mutateAsync(data);
        onDone();
      }}
    />
  );
}

function BookingForm({
  courses,
  onSubmit,
  busy,
}: {
  courses: Course[];
  onSubmit: (data: CreateCourseBookingRequest) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<CreateCourseBookingRequest>({
    courseId: courses[0]?.id ?? "",
    sessionId: "",
    studentUserId: "",
    studentName: "",
    studentEmail: "",
    studentPhone: "",
    bookingMode: "preferred_date",
    preferredDate: "",
    alternateDate: "",
    status: "pending_review",
    studentNote: "",
    experienceLevel: "",
    certificationLevel: "",
    equipmentNeeds: "",
    adminNotes: "",
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
    >
      <SelectField
        label="Course"
        value={form.courseId}
        onChange={(courseId) => setForm({ ...form, courseId })}
        options={courses.map((c) => ({ value: c.id, label: c.title }))}
      />
      <SelectField
        label="Booking mode"
        value={form.bookingMode}
        onChange={(bookingMode) =>
          setForm({
            ...form,
            bookingMode:
              bookingMode as CreateCourseBookingRequest["bookingMode"],
            sessionId: bookingMode === "preferred_date" ? "" : form.sessionId,
          })
        }
        options={[
          { value: "preferred_date", label: "Preferred date request" },
          { value: "session", label: "Schedule selected" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="Student name"
          value={form.studentName}
          onChange={(studentName) => setForm({ ...form, studentName })}
          required
        />
        <TextField
          label="Email"
          value={form.studentEmail}
          onChange={(studentEmail) => setForm({ ...form, studentEmail })}
        />
        <TextField
          label="Phone"
          value={form.studentPhone}
          onChange={(studentPhone) => setForm({ ...form, studentPhone })}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DateField
          label="Preferred date"
          value={form.preferredDate}
          onChange={(preferredDate) => setForm({ ...form, preferredDate })}
          required={form.bookingMode === "preferred_date"}
        />
        <DateField
          label="Alternate date"
          value={form.alternateDate}
          onChange={(alternateDate) => setForm({ ...form, alternateDate })}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(status) =>
            setForm({
              ...form,
              status: status as CreateCourseBookingRequest["status"],
            })
          }
          options={bookingStatusOptions}
        />
      </div>
      {form.bookingMode === "session" ? (
        <TextField
          label="Session ID"
          value={form.sessionId}
          onChange={(sessionId) => setForm({ ...form, sessionId })}
          required
        />
      ) : null}
      <Textarea
        placeholder="Student note"
        value={form.studentNote}
        onChange={(e) => setForm({ ...form, studentNote: e.target.value })}
      />
      <Button type="submit" disabled={busy || !form.courseId}>
        <Send />
        Save booking
      </Button>
    </form>
  );
}

function SchoolPaymentMethodsPanel({
  slug,
  schoolId,
}: {
  slug: string;
  schoolId: string;
}) {
  const methodsQuery = useManagePaymentMethods(slug);
  const createMethod = useCreatePaymentMethod(slug);
  const updateMethod = useUpdatePaymentMethod(slug);
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Payment setup</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Courses use these school-level payment details. Do not collect payment
          setup per course.
        </p>
      </div>
      <PaymentMethodsSetup
        methods={methodsQuery.data ?? []}
        disabled={createMethod.isPending || updateMethod.isPending}
        mediaContextType="payment_method_qr"
        mediaContextId={schoolId}
        emptyDescription="Add Manual QR or bank transfer details before paid courses ask students for proof of payment."
        onCreate={async (data) => {
          await createMethod.mutateAsync(
            sanitizeSchoolPaymentMethodRequest(data),
          );
        }}
        onUpdate={async (paymentMethodId, data) => {
          await updateMethod.mutateAsync({
            paymentMethodId,
            data: sanitizeSchoolPaymentMethodRequest(data),
          });
        }}
      />
    </section>
  );
}

function sanitizeSchoolPaymentMethodRequest(
  data: PaymentMethodSetupSaveValue,
): CreateCoursePaymentMethodRequest & UpdateCoursePaymentMethodRequest {
  const { qrImageUrl: _qrImageUrl, ...request } = data;
  return request;
}

function BookingRow({
  slug,
  booking,
  sessions,
  onAction,
  onAssign,
  onReviewPayment,
  canManage,
}: {
  slug: string;
  booking: CourseBookingRequest;
  sessions: CourseSession[];
  onAction: (
    action: "approve" | "reject" | "schedule" | "complete" | "cancel",
  ) => void;
  onAssign: (sessionId: string) => void;
  onReviewPayment: (action: "verify" | "reject") => void;
  canManage: boolean;
}) {
  const [sessionId, setSessionId] = useState(booking.sessionId);
  const [manageOpen, setManageOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptReloadKey, setReceiptReloadKey] = useState(0);
  useEffect(() => {
    setSessionId(booking.sessionId);
  }, [booking.sessionId]);
  const proofMediaId = booking.payment?.proofMediaId ?? "";
  useEffect(() => {
    if (!manageOpen || !proofMediaId) {
      setReceiptUrl("");
      setReceiptFileName("");
      setReceiptError("");
      setReceiptLoading(false);
      return;
    }
    let active = true;
    setReceiptLoading(true);
    setReceiptError("");
    schoolsApi
      .getBookingPaymentProofUrl(slug, booking.id)
      .then((proof) => {
        if (!active) return;
        setReceiptUrl(proof.url);
        setReceiptFileName(proof.proofFileName || "Payment receipt");
      })
      .catch((error) => {
        if (!active) return;
        setReceiptError(
          getApiErrorMessage(error, "Payment receipt could not be opened."),
        );
      })
      .finally(() => {
        if (active) setReceiptLoading(false);
      });
    return () => {
      active = false;
    };
  }, [manageOpen, proofMediaId, receiptReloadKey, slug, booking.id]);
  const canCancel = ["pending_review", "approved", "scheduled"].includes(
    booking.status,
  );
  const sessionOptions = sessions.map((session) => ({
    value: session.id,
    label: session.title,
  }));
  const runAction = (
    action: "approve" | "reject" | "schedule" | "complete" | "cancel",
  ) => {
    onAction(action);
  };
  const assignSession = () => {
    if (!sessionId) return;
    onAssign(sessionId);
  };
  const reviewPayment = (action: "verify" | "reject") => {
    onReviewPayment(action);
  };
  return (
    <article className="py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {booking.studentName || booking.studentEmail || "Unnamed student"}
            </h2>
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
              {bookingStatusLabels[booking.status]}
            </Badge>
            {booking.payment ? (
              <Badge variant="outline" className="h-5 px-2 text-[11px]">
                {paymentStatusLabels[booking.payment.status]}
              </Badge>
            ) : null}
            <Badge variant="outline" className="h-5 px-2 text-[11px]">
              {bookingModeLabels[booking.bookingMode]}
            </Badge>
          </div>
          <div className="grid gap-1 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="text-foreground">Course:</span>{" "}
              {booking.courseTitle}
            </p>
            <p>
              <span className="text-foreground">Session:</span>{" "}
              {booking.sessionTitle || "Not assigned"}
            </p>
            {booking.bookingMode === "preferred_date" &&
              booking.preferredDate ? (
              <p>
                <span className="text-foreground">Preferred:</span>{" "}
                {booking.preferredDate}
              </p>
            ) : null}
            {booking.alternateDate ? (
              <p>
                <span className="text-foreground">Alternate:</span>{" "}
                {booking.alternateDate}
              </p>
            ) : null}
            {booking.studentEmail ? (
              <p>
                <span className="text-foreground">Email:</span>{" "}
                {booking.studentEmail}
              </p>
            ) : null}
            {booking.studentPhone ? (
              <p>
                <span className="text-foreground">Phone:</span>{" "}
                {booking.studentPhone}
              </p>
            ) : null}
          </div>
        </div>
        {canManage ? (
          <Dialog open={manageOpen} onOpenChange={setManageOpen}>
            <DialogTrigger
              render={
                <Button size="sm" variant="outline" className="self-start">
                  <Settings2 className="mr-1 h-4 w-4" />
                  Manage
                </Button>
              }
            />
            <DialogContent className="max-w-xl!">
              <DialogHeader>
                <DialogTitle>Manage booking</DialogTitle>
                <DialogDescription>
                  Review the request, assign a session, or update payment
                  review.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {booking.studentName ||
                        booking.studentEmail ||
                        "Unnamed student"}
                    </p>
                    <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                      {bookingStatusLabels[booking.status]}
                    </Badge>
                    {booking.payment ? (
                      <Badge variant="outline" className="h-5 px-2 text-[11px]">
                        {paymentStatusLabels[booking.payment.status]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {booking.courseTitle}
                    {booking.sessionTitle ? ` - ${booking.sessionTitle}` : ""}
                  </p>
                </div>

                <section className="grid gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Booking status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {booking.status === "pending_review" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runAction("approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runAction("reject")}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {booking.status === "scheduled" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction("complete")}
                      >
                        Complete
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction("cancel")}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    {!canCancel &&
                      booking.status !== "pending_review" &&
                      booking.status !== "scheduled" ? (
                      <p className="text-xs text-muted-foreground">
                        No status actions are available for this booking.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="grid gap-2">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    Assign session
                  </h3>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={sessionId}
                      onValueChange={(value) => setSessionId(value ?? "")}
                      items={sessionOptions}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Assign session" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {sessionOptions.map((session) => (
                            <SelectItem
                              key={session.value}
                              value={session.value}
                            >
                              {session.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!sessionId}
                      onClick={assignSession}
                    >
                      Assign
                    </Button>
                  </div>
                </section>

                {booking.payment ? (
                  <section className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-medium text-muted-foreground">
                        Payment receipt
                      </h3>
                      {receiptUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              receiptUrl,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <ExternalLink className="mr-1 h-4 w-4" />
                          Open
                        </Button>
                      ) : null}
                    </div>
                    {proofMediaId ? (
                      <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20">
                        {receiptLoading ? (
                          <p className="p-3 text-xs text-muted-foreground">
                            Loading receipt...
                          </p>
                        ) : receiptError ? (
                          <div className="grid gap-2 p-3">
                            <p className="text-xs text-destructive">
                              {receiptError}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-fit"
                              onClick={() =>
                                setReceiptReloadKey((value) => value + 1)
                              }
                            >
                              Retry
                            </Button>
                          </div>
                        ) : receiptUrl ? (
                          <button
                            type="button"
                            className="block w-full bg-background text-left"
                            onClick={() =>
                              window.open(
                                receiptUrl,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <img
                              src={receiptUrl}
                              alt="Payment receipt"
                              className="max-h-80 w-full object-contain"
                            />
                          </button>
                        ) : null}
                        {receiptFileName ? (
                          <p className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
                            {receiptFileName}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                        No payment receipt has been uploaded yet.
                      </p>
                    )}
                  </section>
                ) : null}

                {booking.payment?.status === "submitted" ? (
                  <section className="grid gap-2">
                    <h3 className="text-xs font-medium text-muted-foreground">
                      Payment review
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewPayment("verify")}
                      >
                        Verify payment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewPayment("reject")}
                      >
                        Reject payment
                      </Button>
                    </div>
                  </section>
                ) : null}
              </div>
              <DialogFooter showCloseButton />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </article>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
        items={options}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={`${label}-${option.value}`} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <DatePicker
        required={required}
        value={dateStringToDate(value)}
        onSelect={(date) => onChange(dateToDateString(date))}
      />
    </div>
  );
}

function Toolbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function StateText({ text }: { text: string }) {
  return <p className="text-xs leading-5 text-muted-foreground">{text}</p>;
}

function SchoolCreateBlockedState({
  status,
  message,
  rejectionReason,
}: {
  status: string;
  message?: string;
  rejectionReason?: string;
}) {
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  return (
    <Alert>
      <AlertTitle>
        {isPending
          ? "Your instructor application is under review."
          : isRejected
            ? "Your instructor application needs changes."
            : "School creation is available for verified instructors."}
      </AlertTitle>
      <AlertDescription className="grid gap-3">
        <span>
          {message ||
            "Schools represent real teaching operations in the community. Apply as an instructor first so we can verify your credentials."}
        </span>
        {isRejected && rejectionReason ? <span>{rejectionReason}</span> : null}
        {!isPending ? (
          <Button
            size="sm"
            className="justify-self-start"
            nativeButton={false}
            render={<Link href="/instructor/apply" />}
          >
            Apply as instructor
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <CommunityPageShell>
      <StateText text={text} />
    </CommunityPageShell>
  );
}

function UnauthorizedState() {
  return (
    <CommunityPageShell>
      <CommunityEmptyState
        title="School management unavailable"
        description="Sign in with a school owner, admin, or instructor account to manage schools."
      />
    </CommunityPageShell>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DEFAULT_TIMEZONE,
  }).format(new Date(value));
}

function toIso(value: string) {
  if (!value) return "";
  const parsed = parseDateTimeLocal(value);
  if (!parsed) return "";
  try {
    const wallClockUTC = Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      parsed.hour,
      parsed.minute,
      parsed.second,
    );
    const firstOffset = getTimeZoneOffsetMs(
      new Date(wallClockUTC),
      DEFAULT_TIMEZONE,
    );
    const correctedUTC = wallClockUTC - firstOffset;
    const secondOffset = getTimeZoneOffsetMs(
      new Date(correctedUTC),
      DEFAULT_TIMEZONE,
    );
    const date = new Date(wallClockUTC - secondOffset);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString();
  } catch {
    return "";
  }
}

function toDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: DEFAULT_TIMEZONE,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const year = part("year");
  const month = part("month");
  const day = part("day");
  const hour = part("hour");
  const minute = part("minute");
  if (!year || !month || !day || !hour || !minute) return "";
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  return {
    year: Number.parseInt(match[1] ?? "", 10),
    month: Number.parseInt(match[2] ?? "", 10),
    day: Number.parseInt(match[3] ?? "", 10),
    hour: Number.parseInt(match[4] ?? "", 10),
    minute: Number.parseInt(match[5] ?? "", 10),
    second: Number.parseInt(match[6] ?? "0", 10),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(parts.find((item) => item.type === type)?.value ?? "0", 10);
  const asUTC = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return asUTC - date.getTime();
}
