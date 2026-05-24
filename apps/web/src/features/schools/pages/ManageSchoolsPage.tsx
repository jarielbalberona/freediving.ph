"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  CourseSession,
  CourseSessionStatus,
  CreateCourseBookingRequest,
  CreateCourseRequest,
  CreateCourseSessionRequest,
  CreateSchoolRequest,
  School,
} from "@freediving.ph/types";
import { CalendarPlus, Check, CreditCard, Plus, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarkdownEditor } from "@/features/chika/components/MarkdownEditor";
import { DiveSiteCombobox } from "@/features/diveSpots/components/DiveSiteCombobox";
import { LocationSearch } from "@/features/locations/components";
import type { LocationSearchValue } from "@/features/locations/types/location-search";
import {
  bookingStatusLabels,
  courseLevelLabels,
  courseStatusLabels,
  courseTypeLabels,
  paymentMethodTypeLabels,
  paymentStatusLabels,
  schoolStatusLabels,
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
  useUpdateSchool,
} from "../hooks/mutations";
import {
  useManageBookings,
  useManageCourses,
  useManagePaymentMethods,
  useManageSchool,
  useManageSchools,
  useManageSessions,
} from "../hooks/queries";

type Option = { value: string; label: string };
type SchoolLocationSource = NonNullable<LocationSearchValue["locationSource"]>;

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
const sessionStatusOptions = Object.entries(sessionStatusLabels).map(
  ([value, label]) => ({ value, label }),
);
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
  const createSchool = useCreateSchool();
  const [open, setOpen] = useState(false);

  if (isLoaded && !isSignedIn) {
    return <UnauthorizedState />;
  }

  const schools = schoolsQuery.data ?? [];

  async function onCreate(data: CreateSchoolRequest) {
    const school = await createSchool.mutateAsync(data);
    setOpen(false);
    router.push(`/manage/schools/${school.slug}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">
            Manage schools
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create and manage freediving schools, courses, bookings, and
            sessions.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
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
      </div>

      {schoolsQuery.isLoading ? <StateText text="Loading schools..." /> : null}
      {schoolsQuery.isError ? (
        <StateText text="Could not load schools. Check your account access." />
      ) : null}
      {!schoolsQuery.isLoading && schools.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8">
          <h2 className="text-lg font-medium">No schools yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Register your school to start adding courses and managing bookings.
          </p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            <Plus />
            Add school
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3">
        {schools.map((school) => (
          <div
            key={school.id}
            className="grid gap-4 rounded-lg border p-4 md:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-medium">{school.name}</h2>
                <Badge variant="secondary">
                  {schoolStatusLabels[school.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {school.baseLocation || "No base location yet"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{school.courseCount} courses</span>
                <span>{school.upcomingSessionCount} upcoming sessions</span>
                <span>{school.pendingBookingCount} pending bookings</span>
              </div>
            </div>
            <Button
              variant="outline"
              render={<Link href={`/manage/schools/${school.slug}`} />}
            >
              Open
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}

export function ManageSchoolOverviewPage({ slug }: { slug: string }) {
  const schoolQuery = useManageSchool(slug);
  const [editing, setEditing] = useState(false);
  const school = schoolQuery.data;

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <StateText text="Loading school..." />;

  return (
    <SchoolShell school={school}>
      <div className="grid gap-4 md:grid-cols-5">
        <Stat label="Total courses" value={school.courseCount} />
        <Stat label="Published" value={school.publishedCourseCount} />
        <Stat label="Pending bookings" value={school.pendingBookingCount} />
        <Stat label="Upcoming sessions" value={school.upcomingSessionCount} />
        <Stat label="Payments to review" value={school.paymentsToReviewCount} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          render={<Link href={`/manage/schools/${slug}/courses`} />}
        >
          Manage courses
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/manage/schools/${slug}/bookings`} />}
        >
          Booking requests
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/manage/schools/${slug}/sessions`} />}
        >
          Sessions
        </Button>
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogTrigger render={<Button>Edit school</Button>} />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit school</DialogTitle>
            </DialogHeader>
            <EditSchoolForm school={school} onDone={() => setEditing(false)} />
          </DialogContent>
        </Dialog>
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
  const school = schoolQuery.data;
  const courses = coursesQuery.data ?? [];

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <StateText text="Loading school..." />;

  return (
    <SchoolShell school={school} active="courses">
      <Toolbar
        title="Courses"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                <Plus />
                Add course
                </Button>
              }
            />
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add course</DialogTitle>
              </DialogHeader>
              <CourseForm
                onSubmit={async (data) => {
                  await createCourse.mutateAsync(data);
                  setOpen(false);
                }}
                busy={createCourse.isPending}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-3">
        {courses.map((course) => (
          <div key={course.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{course.title}</h2>
                  <Badge variant="secondary">
                    {courseStatusLabels[course.status]}
                  </Badge>
                  <Badge variant="outline">
                    {courseTypeLabels[course.courseType]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {course.shortDescription || "No short description yet"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                  <span>{course.locationLabel || "No location set"}</span>
                  <span>{course.upcomingSessionCount} upcoming sessions</span>
                  <span>{course.pendingBookingCount} pending bookings</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentCourse(course)}
                >
                  <CreditCard />
                  Payment methods
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/manage/schools/${slug}/sessions`} />}
                >
                  <CalendarPlus />
                  Create session
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {courses.length === 0 ? <StateText text="No courses yet." /> : null}
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
  const school = schoolQuery.data;
  const courses = coursesQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <StateText text="Loading school..." />;

  return (
    <SchoolShell school={school} active="sessions">
      <Toolbar
        title="Sessions"
        subtitle="Schedule class dates, assign bookings, and track attendance."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                <Plus />
                Add session
                </Button>
              }
            />
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add session</DialogTitle>
              </DialogHeader>
              <SessionForm
                courses={courses}
                onSubmit={async (data) => {
                  await createSession.mutateAsync(data);
                  setOpen(false);
                }}
                busy={createSession.isPending}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
        <SelectField
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "All statuses" }, ...sessionStatusOptions]}
        />
      </div>
      <div className="grid gap-3">
        {sessions.map((session) => (
          <div key={session.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{session.title}</h2>
                  <Badge variant="secondary">
                    {sessionStatusLabels[session.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session.courseTitle} • {formatDateTime(session.startsAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{session.locationLabel || "No location"}</span>
                  <span>
                    {session.assignedBookingCount}
                    {session.capacity ? `/${session.capacity}` : ""} assigned
                  </span>
                  <span>
                    {session.instructorDisplayName || "No instructor assigned"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
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
                  size="sm"
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
            </div>
          </div>
        ))}
      </div>
      {sessions.length === 0 ? <StateText text="No sessions match." /> : null}
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

  if (schoolQuery.isError) return <UnauthorizedState />;
  if (!school) return <StateText text="Loading school..." />;

  return (
    <SchoolShell school={school} active="bookings">
      <Toolbar
        title="Booking requests"
        subtitle="Review requests, assign sessions, and keep payment review separate from booking status."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                <Plus />
                Add booking
                </Button>
              }
            />
            <DialogContent className="max-w-2xl">
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
        }
      />
      <div className="grid gap-3 md:grid-cols-5">
        <Stat
          label="Pending review"
          value={bookings.filter((b) => b.status === "pending_review").length}
        />
        <Stat
          label="Approved"
          value={bookings.filter((b) => b.status === "approved").length}
        />
        <Stat
          label="Scheduled"
          value={bookings.filter((b) => b.status === "scheduled").length}
        />
        <Stat
          label="Payment submitted"
          value={bookings.filter((b) => b.payment?.status === "submitted").length}
        />
        <Stat
          label="Completed"
          value={bookings.filter((b) => b.status === "completed").length}
        />
      </div>
      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
        <SelectField
          label="Booking status"
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "All statuses" }, ...bookingStatusOptions]}
        />
        <SelectField
          label="Payment status"
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={[{ value: "", label: "All payments" }, ...paymentStatusOptions]}
        />
      </div>
      <div className="grid gap-3">
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
          />
        ))}
      </div>
      {bookings.length === 0 ? <StateText text="No bookings match." /> : null}
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            {school.name}
          </h1>
          <Badge variant="secondary">{schoolStatusLabels[school.status]}</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {school.shortDescription || "No school description yet."}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {school.baseLocation || "No base location set"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!active ? "default" : "outline"}
          size="sm"
          render={<Link href={`/manage/schools/${school.slug}`} />}
        >
          Overview
        </Button>
        <Button
          variant={active === "courses" ? "default" : "outline"}
          size="sm"
          render={<Link href={`/manage/schools/${school.slug}/courses`} />}
        >
          Courses
        </Button>
        <Button
          variant={active === "bookings" ? "default" : "outline"}
          size="sm"
          render={<Link href={`/manage/schools/${school.slug}/bookings`} />}
        >
          Bookings
        </Button>
        <Button
          variant={active === "sessions" ? "default" : "outline"}
          size="sm"
          render={<Link href={`/manage/schools/${school.slug}/sessions`} />}
        >
          Sessions
        </Button>
      </div>
      {children}
    </main>
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
  const [form, setForm] = useState<CreateSchoolRequest>({
    name: initial?.name ?? "",
    shortDescription: initial?.shortDescription ?? "",
    descriptionMarkdown: initial?.descriptionMarkdown ?? "",
    baseLocation: initial?.baseLocation ?? "",
    baseLocationLabel: initial?.baseLocationLabel ?? initial?.baseLocation ?? "",
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
  });
  const locationValue: LocationSearchValue = {
    locationName: form.baseLocationLabel ?? form.baseLocation ?? "",
    formattedAddress: form.formattedAddress ?? "",
    regionCode: form.regionCode ?? "",
    regionName: form.regionName ?? "",
    provinceCode: form.provinceCode ?? "",
    provinceName: form.provinceName ?? "",
    cityCode: form.cityCode ?? "",
    cityName: form.cityName ?? "",
    barangayCode: form.barangayCode ?? "",
    barangayName: form.barangayName ?? "",
    locationSource: normalizeLocationSource(form.locationSource),
  };
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(form);
      }}
    >
      <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
      <TextField label="Short description" value={form.shortDescription} onChange={(shortDescription) => setForm({ ...form, shortDescription })} />
      <div className="grid gap-2">
        <Label>Base location</Label>
        <LocationSearch
          value={locationValue}
          onChange={(location) =>
            setForm({
              ...form,
              baseLocation: location.locationName ?? "",
              baseLocationLabel: location.locationName ?? "",
              formattedAddress: location.formattedAddress ?? "",
              regionCode: location.regionCode ?? "",
              regionName: location.regionName ?? "",
              provinceCode: location.provinceCode ?? "",
              provinceName: location.provinceName ?? "",
              cityCode: location.cityCode ?? "",
              cityName: location.cityName ?? "",
              barangayCode: location.barangayCode ?? "",
              barangayName: location.barangayName ?? "",
              locationSource: location.locationSource ?? "manual",
            })
          }
          disabled={busy}
        />
      </div>
      <div className="grid gap-2">
        <Label>Optional dive site</Label>
        <DiveSiteCombobox
          value={form.diveSiteId ?? ""}
          valueLabel={initial?.diveSiteName}
          onValueChange={(diveSiteId) => setForm({ ...form, diveSiteId })}
          searchPlaceholder="Link a dive site"
          allOption={{ value: "", label: "No dive site" }}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Contact email" value={form.contactEmail} onChange={(contactEmail) => setForm({ ...form, contactEmail })} />
        <TextField label="Phone" value={form.contactPhone} onChange={(contactPhone) => setForm({ ...form, contactPhone })} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Website" value={form.websiteUrl} onChange={(websiteUrl) => setForm({ ...form, websiteUrl })} />
        <TextField label="Facebook" value={form.facebookUrl} onChange={(facebookUrl) => setForm({ ...form, facebookUrl })} />
        <TextField label="Instagram" value={form.instagramUrl} onChange={(instagramUrl) => setForm({ ...form, instagramUrl })} />
      </div>
      <Button type="submit" disabled={busy}>
        <Send />
        Save school
      </Button>
    </form>
  );
}

function normalizeLocationSource(value?: string): SchoolLocationSource {
  if (
    value === "google_places" ||
    value === "psgc_mapped" ||
    value === "unmapped"
  ) {
    return value;
  }
  return "manual";
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
  onSubmit,
  busy,
}: {
  onSubmit: (data: CreateCourseRequest) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<CreateCourseRequest>({
    title: "",
    shortDescription: "",
    descriptionMarkdown: "",
    courseType: "custom",
    level: "",
    durationLabel: "",
    priceAmount: null,
    currency: "PHP",
    paymentRequired: false,
    approvalRequired: true,
    locationLabel: "",
    diveSiteId: "",
    includedMarkdown: "",
    prerequisitesMarkdown: "",
    equipmentMarkdown: "",
    cancellationPolicyMarkdown: "",
    availabilityNote: "",
    status: "draft",
  });
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void onSubmit(form); }}>
      <TextField label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
      <TextField label="Short description" value={form.shortDescription} onChange={(shortDescription) => setForm({ ...form, shortDescription })} />
      <MarkdownEditor value={form.descriptionMarkdown} onChange={(descriptionMarkdown) => setForm({ ...form, descriptionMarkdown })} placeholder="Course description" />
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField label="Course type" value={form.courseType} onChange={(courseType) => setForm({ ...form, courseType: courseType as CreateCourseRequest["courseType"] })} options={courseTypeOptions} />
        <SelectField label="Level" value={form.level} onChange={(level) => setForm({ ...form, level: level as CreateCourseRequest["level"] })} options={courseLevelOptions} />
        <SelectField label="Status" value={form.status} onChange={(status) => setForm({ ...form, status: status as CreateCourseRequest["status"] })} options={courseStatusOptions} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Duration" value={form.durationLabel} onChange={(durationLabel) => setForm({ ...form, durationLabel })} />
        <TextField label="Price" type="number" value={form.priceAmount?.toString() ?? ""} onChange={(value) => setForm({ ...form, priceAmount: value ? Number(value) : null })} />
        <TextField label="Location" value={form.locationLabel} onChange={(locationLabel) => setForm({ ...form, locationLabel })} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.paymentRequired} onChange={(e) => setForm({ ...form, paymentRequired: e.target.checked })} /> Payment required</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.approvalRequired} onChange={(e) => setForm({ ...form, approvalRequired: e.target.checked })} /> Approval required</label>
      </div>
      <Button type="submit" disabled={busy}><Send />Save course</Button>
    </form>
  );
}

function SessionForm({
  courses,
  onSubmit,
  busy,
}: {
  courses: Course[];
  onSubmit: (data: CreateCourseSessionRequest) => Promise<void>;
  busy: boolean;
}) {
  const firstCourse = courses[0]?.id ?? "";
  const [form, setForm] = useState<CreateCourseSessionRequest>({
    courseId: firstCourse,
    title: "",
    startsAt: "",
    endsAt: "",
    timezone: "Asia/Manila",
    locationLabel: "",
    diveSiteId: "",
    instructorUserId: "",
    capacity: null,
    status: "draft",
    notesMarkdown: "",
  });
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void onSubmit({ ...form, startsAt: toIso(form.startsAt), endsAt: toIso(form.endsAt) }); }}>
      <SelectField label="Course" value={form.courseId} onChange={(courseId) => setForm({ ...form, courseId })} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
      <TextField label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} required />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Starts" type="datetime-local" value={form.startsAt} onChange={(startsAt) => setForm({ ...form, startsAt })} required />
        <TextField label="Ends" type="datetime-local" value={form.endsAt} onChange={(endsAt) => setForm({ ...form, endsAt })} required />
        <SelectField label="Status" value={form.status} onChange={(status) => setForm({ ...form, status: status as CreateCourseSessionRequest["status"] })} options={sessionStatusOptions} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Timezone" value={form.timezone} onChange={(timezone) => setForm({ ...form, timezone })} />
        <TextField label="Location" value={form.locationLabel} onChange={(locationLabel) => setForm({ ...form, locationLabel })} />
        <TextField label="Capacity" type="number" value={form.capacity?.toString() ?? ""} onChange={(value) => setForm({ ...form, capacity: value ? Number(value) : null })} />
      </div>
      <MarkdownEditor value={form.notesMarkdown} onChange={(notesMarkdown) => setForm({ ...form, notesMarkdown })} placeholder="Session notes" minRows={5} />
      <Button type="submit" disabled={busy || !form.courseId}><Send />Save session</Button>
    </form>
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
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void onSubmit(form); }}>
      <SelectField label="Course" value={form.courseId} onChange={(courseId) => setForm({ ...form, courseId })} options={courses.map((c) => ({ value: c.id, label: c.title }))} />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Student name" value={form.studentName} onChange={(studentName) => setForm({ ...form, studentName })} required />
        <TextField label="Email" value={form.studentEmail} onChange={(studentEmail) => setForm({ ...form, studentEmail })} />
        <TextField label="Phone" value={form.studentPhone} onChange={(studentPhone) => setForm({ ...form, studentPhone })} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Preferred date" type="date" value={form.preferredDate} onChange={(preferredDate) => setForm({ ...form, preferredDate })} required />
        <TextField label="Alternate date" type="date" value={form.alternateDate} onChange={(alternateDate) => setForm({ ...form, alternateDate })} />
        <SelectField label="Status" value={form.status} onChange={(status) => setForm({ ...form, status: status as CreateCourseBookingRequest["status"] })} options={bookingStatusOptions} />
      </div>
      <Textarea placeholder="Student note" value={form.studentNote} onChange={(e) => setForm({ ...form, studentNote: e.target.value })} />
      <Button type="submit" disabled={busy || !form.courseId}><Send />Save booking</Button>
    </form>
  );
}

function PaymentMethodsPanel({ slug, course }: { slug: string; course: Course }) {
  const methodsQuery = useManagePaymentMethods(slug, course.id);
  const createMethod = useCreatePaymentMethod(slug, course.id);
  const [type, setType] = useState<"MANUAL_QR" | "MANUAL_BANK_TRANSFER">("MANUAL_QR");
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
}: {
  booking: CourseBookingRequest;
  sessions: CourseSession[];
  onAction: (action: "approve" | "reject" | "schedule" | "complete" | "cancel") => void;
  onAssign: (sessionId: string) => void;
  onReviewPayment: (action: "verify" | "reject") => void;
}) {
  const [sessionId, setSessionId] = useState(booking.sessionId);
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">
              {booking.studentName || booking.studentEmail || "Unnamed student"}
            </h2>
            <Badge variant="secondary">
              {bookingStatusLabels[booking.status]}
            </Badge>
            {booking.payment ? (
              <Badge variant="outline">
                {paymentStatusLabels[booking.payment.status]}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.courseTitle} • preferred {booking.preferredDate}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.sessionTitle || "No session assigned"}
          </p>
        </div>
        <div className="flex max-w-sm flex-wrap gap-2">
          {booking.status === "pending_review" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onAction("approve")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => onAction("reject")}>Reject</Button>
            </>
          ) : null}
          {booking.status === "scheduled" ? (
            <Button size="sm" variant="outline" onClick={() => onAction("complete")}>Complete</Button>
          ) : null}
          {["pending_review", "approved", "scheduled"].includes(booking.status) ? (
            <Button size="sm" variant="outline" onClick={() => onAction("cancel")}>Cancel</Button>
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
            <Button size="sm" disabled={!sessionId} onClick={() => onAssign(sessionId)}>
              Assign
            </Button>
          </div>
          {booking.payment?.status === "submitted" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => onReviewPayment("verify")}>Verify payment</Button>
              <Button size="sm" variant="outline" onClick={() => onReviewPayment("reject")}>Reject payment</Button>
            </>
          ) : null}
        </div>
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
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function StateText({ text }: { text: string }) {
  return <div className="rounded-lg border p-6 text-sm text-muted-foreground">{text}</div>;
}

function UnauthorizedState() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-lg border p-6">
        <h1 className="text-xl font-semibold">School management unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a school owner, admin, or instructor account to manage
          schools.
        </p>
      </div>
    </main>
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
