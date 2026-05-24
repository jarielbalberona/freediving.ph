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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/nextjs";
import type {
  Course,
  CourseBookingPaymentStatus,
  CourseBookingRequest,
  CourseBookingStatus,
  CourseLocationMode,
  CourseSession,
  CourseSessionStatus,
  CreateCourseBookingRequest,
  CreateCourseRequest,
  CreateCourseSessionRequest,
  CreateSchoolRequest,
  School,
  SessionLocationMode,
} from "@freediving.ph/types";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  CreditCard,
  Pencil,
  Plus,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
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
import { applyApiErrorsToForm } from "@/lib/forms/api-errors";
import {
  bookingStatusLabels,
  courseLocationModeLabels,
  courseLevelLabels,
  courseStatusLabels,
  courseTypeLabels,
  paymentMethodTypeLabels,
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
              <DialogContent className="max-w-2xl">
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
  const [editing, setEditing] = useState(false);
  const school = schoolQuery.data;
  const canEditSchool = school ? canEditSchoolSettings(school) : false;

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
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/manage/schools/${slug}/courses`} />}
        >
          Manage courses
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/manage/schools/${slug}/bookings`} />}
        >
          Booking requests
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/manage/schools/${slug}/sessions`} />}
        >
          Sessions
        </Button>
        {canEditSchool ? (
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogTrigger render={<Button size="sm">Edit school</Button>} />
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit school</DialogTitle>
              </DialogHeader>
              <EditSchoolForm
                school={school}
                onDone={() => setEditing(false)}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </SchoolShell>
  );
}

export function ManageCoursesPage({ slug }: { slug: string }) {
  const schoolQuery = useManageSchool(slug);
  const coursesQuery = useManageCourses(slug);
  const createCourse = useCreateCourse(slug);
  const [open, setOpen] = useState(false);
  const [paymentCourse, setPaymentCourse] = useState<Course | null>(null);
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
                      ? `${course.currency} ${course.priceAmount ?? 0}`
                      : "No payment required"}
                  </span>
                  <span>
                    {course.approvalRequired
                      ? "Approval required"
                      : "Auto-approval allowed"}
                  </span>
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
                    onClick={() => setPaymentCourse(course)}
                  >
                    <CreditCard />
                    Payment methods
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
        open={paymentCourse != null}
        onOpenChange={(next) => !next && setPaymentCourse(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment methods</DialogTitle>
          </DialogHeader>
          {paymentCourse ? (
            <PaymentMethodsPanel slug={slug} course={paymentCourse} />
          ) : null}
        </DialogContent>
      </Dialog>
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
        subtitle="Schedule class dates, assign bookings, and track attendance."
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
      <div className="grid gap-2 rounded-xl border border-border/70 bg-background/60 p-2.5 sm:grid-cols-2">
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
                    {session.assignedBookingCount}
                    {session.capacity ? `/${session.capacity}` : ""} assigned
                  </span>
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
  const filters = useMemo(
    () => ({
      status: status as CourseBookingStatus | undefined,
      paymentStatus: paymentStatus as CourseBookingPaymentStatus | undefined,
    }),
    [status, paymentStatus],
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
      <div className="grid gap-2 rounded-xl border border-border/70 bg-background/60 p-2.5 sm:grid-cols-2">
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
  children,
}: {
  school: School;
  active?: "courses" | "bookings" | "sessions";
  children: React.ReactNode;
}) {
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
          <Badge variant="secondary" className="h-5 px-2 text-[11px]">
            {schoolStatusLabels[school.status]}
          </Badge>
        }
      >
        <p className="text-xs text-muted-foreground">
          {school.baseLocation || "No base location set"}
        </p>
      </CommunityHeader>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button
          variant={!active ? "default" : "outline"}
          size="sm"
          nativeButton={false}
          render={<Link href={`/manage/schools/${school.slug}`} />}
        >
          Overview
        </Button>
        <Button
          variant={active === "courses" ? "default" : "outline"}
          size="sm"
          nativeButton={false}
          render={<Link href={`/manage/schools/${school.slug}/courses`} />}
        >
          Courses
        </Button>
        <Button
          variant={active === "bookings" ? "default" : "outline"}
          size="sm"
          nativeButton={false}
          render={<Link href={`/manage/schools/${school.slug}/bookings`} />}
        >
          Bookings
        </Button>
        <Button
          variant={active === "sessions" ? "default" : "outline"}
          size="sm"
          nativeButton={false}
          render={<Link href={`/manage/schools/${school.slug}/sessions`} />}
        >
          Sessions
        </Button>
      </div>
      {children}
    </CommunityPageShell>
  );
}

function SchoolForm({
  onSubmit,
  busy,
  initial,
}: {
  onSubmit: (data: CreateSchoolRequest) => Promise<void>;
  busy: boolean;
  initial?: School;
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
    currency: initial?.currency ?? "PHP",
    paymentRequired: initial?.paymentRequired ?? false,
    approvalRequired: initial?.approvalRequired ?? true,
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
      <div className="grid gap-4 md:grid-cols-3">
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
        <TextField
          label="Currency"
          value={form.currency}
          onChange={(currency) => setForm({ ...form, currency })}
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
    timezone: initial?.timezone ?? "Asia/Manila",
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
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="Timezone"
          value={form.timezone}
          onChange={(timezone) => setForm({ ...form, timezone })}
        />
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
        <TextField
          label="Preferred date"
          type="date"
          value={form.preferredDate}
          onChange={(preferredDate) => setForm({ ...form, preferredDate })}
          required
        />
        <TextField
          label="Alternate date"
          type="date"
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

function PaymentMethodsPanel({
  slug,
  course,
}: { slug: string; course: Course }) {
  const methodsQuery = useManagePaymentMethods(slug, course.id);
  const createMethod = useCreatePaymentMethod(slug, course.id);
  const [type, setType] = useState<"MANUAL_QR" | "MANUAL_BANK_TRANSFER">(
    "MANUAL_QR",
  );
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {(methodsQuery.data ?? []).map((method) => (
          <div key={method.id} className="rounded-md border p-3 text-sm">
            <div className="font-medium">{method.name}</div>
            <div className="text-muted-foreground">
              {paymentMethodTypeLabels[method.type]} •{" "}
              {method.isActive ? "Active" : "Inactive"}
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 rounded-md border p-3">
        <SelectField
          label="Type"
          value={type}
          onChange={(value) => setType(value as typeof type)}
          options={Object.entries(paymentMethodTypeLabels).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <TextField label="Name" value={name} onChange={setName} />
        <Textarea
          placeholder="Instructions"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
        <Button
          disabled={!name || createMethod.isPending}
          onClick={() =>
            createMethod.mutate({
              type,
              name,
              instructions,
              qrMediaId: "",
              bankName: type === "MANUAL_BANK_TRANSFER" ? "Bank" : "",
              accountName: type === "MANUAL_BANK_TRANSFER" ? "Account" : "",
              accountNumber: type === "MANUAL_BANK_TRANSFER" ? "0000" : "",
              isActive: true,
            })
          }
        >
          <Plus />
          Add method
        </Button>
      </div>
    </div>
  );
}

function BookingRow({
  booking,
  sessions,
  onAction,
  onAssign,
  onReviewPayment,
  canManage,
}: {
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
  return (
    <div className="py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">
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
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {booking.courseTitle} • preferred {booking.preferredDate}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {booking.sessionTitle || "No session assigned"}
          </p>
        </div>
        {canManage ? (
          <div className="flex max-w-sm flex-wrap gap-2">
            {booking.status === "pending_review" ? (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onAction("approve")}
                >
                  Approve
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onAction("reject")}
                >
                  Reject
                </Button>
              </>
            ) : null}
            {booking.status === "scheduled" ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onAction("complete")}
              >
                Complete
              </Button>
            ) : null}
            {["pending_review", "approved", "scheduled"].includes(
              booking.status,
            ) ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onAction("cancel")}
              >
                Cancel
              </Button>
            ) : null}
            <div className="flex w-full gap-2">
              <Select
                value={sessionId}
                onValueChange={(value) => setSessionId(value ?? "")}
                items={sessions.map((session) => ({
                  value: session.id,
                  label: session.title,
                }))}
              >
                <SelectTrigger className="min-w-44">
                  <SelectValue placeholder="Assign session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                size="xs"
                disabled={!sessionId}
                onClick={() => onAssign(sessionId)}
              >
                Assign
              </Button>
            </div>
            {booking.payment?.status === "submitted" ? (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onReviewPayment("verify")}
                >
                  Verify payment
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onReviewPayment("reject")}
                >
                  Reject payment
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
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
  }).format(new Date(value));
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function toDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
