"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommunityBrowseToolbar,
  CommunityEmptyState,
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ChikaMarkdown } from "@/features/chika/components/ChikaMarkdown";
import { PaymentMethodCustomerDisplay } from "@/features/payments/components/PaymentMethodsSetup";
import { useAuth, SignInButton } from "@clerk/nextjs";
import type {
  CourseLevel,
  CourseType,
  CreateStudentCourseBookingRequest,
  MyCourseBooking,
  PublicCourse,
  PublicCourseFilters,
  PublicCourseSession,
  PublicSchool,
  PublicSchoolFilters,
} from "@freediving.ph/types";
import { ArrowLeft, CalendarPlus, Search, X } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { dateStringToDate, dateToDateString } from "@/lib/date-picker-values";
import { formatPeso } from "@/lib/money";
import {
  bookingStatusLabels,
  bookingModeLabels,
  courseLevelLabels,
  courseTypeLabels,
  paymentStatusLabels,
} from "../constants";
import {
  useCancelMyBooking,
  useCreateStudentBooking,
} from "../hooks/mutations";
import {
  useMyCourseBookings,
  usePublicCourse,
  usePublicCourseSessions,
  usePublicCourses,
  usePublicSchool,
  usePublicSchools,
} from "../hooks/queries";

const courseTypeOptions = Object.entries(courseTypeLabels).map(
  ([value, label]) => ({ value, label }),
);
const courseLevelOptions = Object.entries(courseLevelLabels).map(
  ([value, label]) => ({ value, label }),
);

export function SchoolsBrowsePage() {
  const [filters, setFilters] = useState<PublicSchoolFilters>({});
  const query = usePublicSchools(filters);
  const schools = query.data ?? [];

  return (
    <CommunityPageShell>
      <CommunityHeader
        title="Schools"
        subtitle="Find freediving schools, instructors, and courses around the Philippines."
        action={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/my/bookings" />}
          >
            My bookings
          </Button>
        }
      />
      <CommunityBrowseToolbar
        title="Browse schools"
        description="Search by school, location, or course type."
        label={
          <>
            <Search className="h-3.5 w-3.5" />
            Directory
          </>
        }
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search schools"
              value={filters.search ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </div>
          <Input
            placeholder="Location"
            value={filters.location ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
          />
          <FriendlySelect
            value={filters.courseType ?? ""}
            placeholder="All course types"
            items={[
              { value: "", label: "All course types" },
              ...courseTypeOptions,
            ]}
            onValueChange={(courseType) =>
              setFilters((current) => ({
                ...current,
                courseType: courseType as CourseType | "",
              }))
            }
          />
        </div>
      </CommunityBrowseToolbar>
      {query.isLoading ? <StateText text="Loading schools..." /> : null}
      {query.isError ? <StateText text="Could not load schools." /> : null}
      {!query.isLoading && schools.length === 0 ? (
        <CommunityEmptyState
          title="No schools found"
          description="Try changing your search or location."
        />
      ) : null}
      <div className="divide-y divide-border/70 border-y border-border/70">
        {schools.map((school) => (
          <SchoolCard key={school.id} school={school} />
        ))}
      </div>
    </CommunityPageShell>
  );
}

export function SchoolProfilePage({ slug }: { slug: string }) {
  const schoolQuery = usePublicSchool(slug);
  const coursesQuery = usePublicCourses(slug);
  const school = schoolQuery.data;
  const courses = coursesQuery.data?.courses ?? [];
  if (schoolQuery.isError) return <PageState text="School not found." />;
  if (!school) return <PageState text="Loading school..." />;
  return (
    <SchoolPublicShell school={school}>
      <Tabs defaultValue="overview" className="gap-3">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <p className="text-xs leading-5 text-muted-foreground">
            {school.shortDescription || "Course offerings are available now."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={`/schools/${school.slug}/courses`} />}
            >
              View courses
            </Button>
          </div>
          <CourseGrid school={school} courses={courses.slice(0, 3)} />
        </TabsContent>
        <TabsContent value="courses">
          <CourseGrid school={school} courses={courses} />
        </TabsContent>
        <TabsContent value="about">
          {school.descriptionMarkdown ? (
            <ChikaMarkdown content={school.descriptionMarkdown} />
          ) : (
            <StateText text="No long-form school profile yet." />
          )}
        </TabsContent>
      </Tabs>
    </SchoolPublicShell>
  );
}

export function SchoolCoursesPage({ slug }: { slug: string }) {
  const [filters, setFilters] = useState<PublicCourseFilters>({});
  const query = usePublicCourses(slug, filters);
  const school = query.data?.school;
  const courses = query.data?.courses ?? [];
  if (query.isError) return <PageState text="School not found." />;
  if (!school) return <PageState text="Loading courses..." />;
  return (
    <SchoolPublicShell school={school} compact>
      <CommunityBrowseToolbar
        title="Courses"
        description="Filter by type, level, payment, or course title."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            className="sm:col-span-2"
            placeholder="Search courses"
            value={filters.search ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
          />
          <FriendlySelect
            value={filters.courseType ?? ""}
            placeholder="All course types"
            items={[
              { value: "", label: "All course types" },
              ...courseTypeOptions,
            ]}
            onValueChange={(courseType) =>
              setFilters((current) => ({
                ...current,
                courseType: courseType as CourseType | "",
              }))
            }
          />
          <FriendlySelect
            value={filters.level ?? ""}
            placeholder="All levels"
            items={[{ value: "", label: "All levels" }, ...courseLevelOptions]}
            onValueChange={(level) =>
              setFilters((current) => ({
                ...current,
                level: level as CourseLevel | "",
              }))
            }
          />
          <FriendlySelect
            value={filters.payment ?? ""}
            placeholder="Free or paid"
            items={[
              { value: "", label: "Free or paid" },
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
            ]}
            onValueChange={(payment) =>
              setFilters((current) => ({
                ...current,
                payment: payment as PublicCourseFilters["payment"],
              }))
            }
          />
        </div>
      </CommunityBrowseToolbar>
      <CourseGrid school={school} courses={courses} />
    </SchoolPublicShell>
  );
}

export function CourseDetailPage({
  slug,
  courseSlug,
}: {
  slug: string;
  courseSlug: string;
}) {
  const query = usePublicCourse(slug, courseSlug);
  const sessionsQuery = usePublicCourseSessions(slug, courseSlug);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const data = query.data;
  if (query.isError) return <PageState text="Course not found." />;
  if (!data) return <PageState text="Loading course..." />;
  const { school, course } = data;
  const sessions = sessionsQuery.data ?? [];
  const bookingsEnabled =
    course.allowSessionBooking || course.allowPreferredDateRequest;
  return (
    <SchoolPublicShell school={school} compact>
      <div className="flex flex-col gap-3 border-y border-border/70 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {course.title}
          </h1>
          <CourseMeta course={course} school={school} />
        </div>
        {bookingsEnabled ? (
          <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <CalendarPlus />
                  Book this course
                </Button>
              }
            />
            <BookingDialog
              school={school}
              course={course}
              initialSessionId={selectedSessionId}
              onSuccess={() => setBookingOpen(false)}
            />
          </Dialog>
        ) : null}
      </div>
      <Tabs defaultValue="overview" className="gap-3">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {course.allowSessionBooking ? (
            <TabsTrigger value="schedule">Schedules</TabsTrigger>
          ) : null}
          <TabsTrigger value="included">What&apos;s included</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="book">Book</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {course.shortDescription}
          </p>
          {course.descriptionMarkdown ? (
            <ChikaMarkdown content={course.descriptionMarkdown} />
          ) : null}
        </TabsContent>
        <TabsContent value="schedule">
          <AvailableSchedulesList
            sessions={sessions}
            onBook={(sessionId) => {
              setSelectedSessionId(sessionId);
              setBookingOpen(true);
            }}
            preferredDateEnabled={course.allowPreferredDateRequest}
          />
        </TabsContent>
        <TabsContent value="included">
          {course.includedMarkdown ? (
            <ChikaMarkdown content={course.includedMarkdown} />
          ) : (
            <StateText text="No inclusions listed yet." />
          )}
        </TabsContent>
        <TabsContent value="requirements" className="space-y-4">
          <MarkdownBlock
            title="Prerequisites"
            content={course.prerequisitesMarkdown}
          />
          <MarkdownBlock title="Equipment" content={course.equipmentMarkdown} />
          <MarkdownBlock
            title="Cancellation policy"
            content={course.cancellationPolicyMarkdown}
          />
        </TabsContent>
        <TabsContent value="book">
          <div className="flex flex-col items-start gap-3">
            <p className="text-xs leading-5 text-muted-foreground">
              {bookingSummary(course)}
            </p>
            {bookingsEnabled ? (
              <Button size="sm" onClick={() => setBookingOpen(true)}>
                {course.allowSessionBooking && !course.allowPreferredDateRequest
                  ? "Choose from available schedules"
                  : "Request another date"}
              </Button>
            ) : (
              <StateText text="Bookings are currently unavailable for this course." />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </SchoolPublicShell>
  );
}

export function CourseBookPage({
  slug,
  courseSlug,
}: {
  slug: string;
  courseSlug: string;
}) {
  const query = usePublicCourse(slug, courseSlug);
  if (query.isError) return <PageState text="Course not found." />;
  if (!query.data) return <PageState text="Loading booking form..." />;
  return (
    <CommunityPageShell>
      <SchoolPublicHeader school={query.data.school} compact />
      <BookingForm
        school={query.data.school}
        course={query.data.course}
        onSuccess={() => undefined}
      />
    </CommunityPageShell>
  );
}

export function MyBookingsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const query = useMyCourseBookings();
  const cancelBooking = useCancelMyBooking();
  const bookings = query.data ?? [];
  const [tab, setTab] = useState("active");
  const visible = useMemo(
    () =>
      bookings.filter((booking) => {
        if (tab === "completed") return booking.status === "completed";
        if (tab === "cancelled")
          return (
            booking.status === "cancelled" || booking.status === "rejected"
          );
        return [
          "pending_review",
          "approved",
          "scheduled",
          "reschedule_requested",
        ].includes(booking.status);
      }),
    [bookings, tab],
  );
  if (isLoaded && !isSignedIn) {
    return (
      <CommunityPageShell>
        <SignInPrompt />
      </CommunityPageShell>
    );
  }
  return (
    <CommunityPageShell>
      <CommunityHeader
        title="My bookings"
        subtitle="Track course requests, scheduled sessions, and payment review status."
        navigation={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/schools" />}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Schools
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-3">
        <TabsList className="w-full">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>
      {query.isLoading ? <StateText text="Loading bookings..." /> : null}
      {!query.isLoading && visible.length === 0 ? (
        <CommunityEmptyState
          title="No bookings here"
          description="Course requests will appear here."
        />
      ) : null}
      <div className="divide-y divide-border/70 border-y border-border/70">
        {visible.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            onCancel={() => cancelBooking.mutate(booking.id)}
          />
        ))}
      </div>
    </CommunityPageShell>
  );
}

function SchoolCard({ school }: { school: PublicSchool }) {
  return (
    <article className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {school.name}
          </h2>
          <Badge variant="secondary" className="h-5 px-2 text-[11px]">
            {school.publishedCourseCount} courses
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {school.shortDescription || "Published freediving courses"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {school.baseLocation || "Philippines"}
          {school.diveSiteName ? ` • ${school.diveSiteName}` : ""}
        </p>
      </div>
      <Button
        className="self-start"
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<Link href={`/schools/${school.slug}`} />}
      >
        View school
      </Button>
    </article>
  );
}

function SchoolPublicShell({
  school,
  children,
  compact = false,
}: {
  school: PublicSchool;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <CommunityPageShell>
      <SchoolPublicHeader school={school} compact={compact} />
      {children}
    </CommunityPageShell>
  );
}

function SchoolPublicHeader({
  school,
  compact = false,
}: {
  school: PublicSchool;
  compact?: boolean;
}) {
  return (
    <CommunityHeader
      title={school.name}
      subtitle={`${school.baseLocation || "Philippines"}${
        school.diveSiteName ? ` • ${school.diveSiteName}` : ""
      }`}
      navigation={
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/schools" />}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Schools
        </Button>
      }
      action={
        !compact ? (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/schools/${school.slug}/courses`} />}
          >
            View courses
          </Button>
        ) : null
      }
    />
  );
}

function CourseGrid({
  school,
  courses,
}: {
  school: PublicSchool;
  courses: PublicCourse[];
}) {
  if (courses.length === 0) {
    return (
      <CommunityEmptyState
        title="No courses found"
        description="Try different filters."
      />
    );
  }
  return (
    <div className="divide-y divide-border/70 border-y border-border/70">
      {courses.map((course) => (
        <article
          key={course.id}
          className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {course.title}
              </h2>
              <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                {courseTypeLabels[course.courseType]}
              </Badge>
              {course.level ? (
                <Badge variant="outline" className="h-5 px-2 text-[11px]">
                  {courseLevelLabels[course.level]}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {course.shortDescription}
            </p>
            <CourseMeta course={course} school={school} />
          </div>
          <Button
            className="self-start"
            size="sm"
            variant="outline"
            render={
              <Link href={`/schools/${school.slug}/courses/${course.slug}`} />
            }
          >
            View course
          </Button>
        </article>
      ))}
    </div>
  );
}

function CourseMeta({
  course,
  school,
}: {
  course: PublicCourse;
  school: PublicSchool;
}) {
  const price =
    course.priceAmount == null
      ? "Price on request"
      : formatPeso(course.priceAmount);
  return (
    <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{courseTypeLabels[course.courseType]}</span>
      {course.level ? <span>{courseLevelLabels[course.level]}</span> : null}
      {course.durationLabel ? <span>{course.durationLabel}</span> : null}
      <span>{course.paymentRequired ? price : "No payment required"}</span>
      <span>
        {publicCourseLocationLabel(course, school)} ·{" "}
        {publicCourseLocationHelper(course)}
      </span>
      {course.locationNote ? <span>{course.locationNote}</span> : null}
    </div>
  );
}

function bookingSummary(course: PublicCourse) {
  if (course.allowSessionBooking && course.allowPreferredDateRequest) {
    return "Choose from available schedules or request another date.";
  }
  if (course.allowSessionBooking) {
    return "Choose from available schedules.";
  }
  if (course.allowPreferredDateRequest) {
    return "Send a preferred date request. The school will review it and assign a session later.";
  }
  return "Bookings are currently unavailable for this course.";
}

function sessionSelectLabel(session: PublicCourseSession) {
  const slots =
    session.slotsLeft === null
      ? "open capacity"
      : `${session.slotsLeft} slots left`;
  return `${formatSessionWindow(session)} · ${slots}`;
}

function formatSessionWindow(
  session: Pick<PublicCourseSession, "startsAt" | "endsAt">,
) {
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Schedule time pending";
  }
  return `${start.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })} - ${end.toLocaleTimeString([], { timeStyle: "short" })}`;
}

function publicCourseLocationLabel(course: PublicCourse, school: PublicSchool) {
  if (course.locationMode === "structured") {
    return course.locationLabel || course.formattedAddress || "Course location";
  }
  if (course.locationMode === "text_only") {
    return course.locationLabel || "Text-only location";
  }
  return (
    school.baseLocationLabel ||
    school.formattedAddress ||
    school.baseLocation ||
    "School location"
  );
}

function publicCourseLocationHelper(course: PublicCourse) {
  if (course.locationMode === "structured") {
    return "Course location";
  }
  if (course.locationMode === "text_only") {
    return "Text-only location";
  }
  return "Uses school location";
}

function BookingDialog({
  school,
  course,
  initialSessionId = "",
  onSuccess,
}: {
  school: PublicSchool;
  course: PublicCourse;
  initialSessionId?: string;
  onSuccess: () => void;
}) {
  return (
    <DialogContent className="max-w-2xl!">
      <DialogHeader>
        <DialogTitle>Book {course.title}</DialogTitle>
      </DialogHeader>
      <BookingForm
        school={school}
        course={course}
        initialSessionId={initialSessionId}
        onSuccess={onSuccess}
      />
    </DialogContent>
  );
}

function BookingForm({
  school,
  course,
  initialSessionId = "",
  onSuccess,
}: {
  school: PublicSchool;
  course: PublicCourse;
  initialSessionId?: string;
  onSuccess: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const mutation = useCreateStudentBooking(school.slug, course.slug);
  const sessionsQuery = usePublicCourseSessions(school.slug, course.slug);
  const sessions = sessionsQuery.data ?? [];
  const activePaymentMethods = (school.paymentMethods ?? []).filter(
    (method) => method.isActive,
  );
  const paidCourseUnavailable =
    course.paymentRequired && activePaymentMethods.length === 0;
  const [done, setDone] = useState(false);
  const initialMode =
    course.allowSessionBooking && initialSessionId
      ? "session"
      : course.allowSessionBooking && !course.allowPreferredDateRequest
        ? "session"
        : "preferred_date";
  const [form, setForm] = useState<CreateStudentCourseBookingRequest>({
    bookingMode: initialMode,
    sessionId: initialSessionId,
    preferredDate: "",
  });
  useEffect(() => {
    if (!initialSessionId) return;
    setForm((current) => ({
      ...current,
      bookingMode: "session",
      sessionId: initialSessionId,
    }));
  }, [initialSessionId]);
  if (isLoaded && !isSignedIn) return <SignInPrompt />;
  if (!course.allowSessionBooking && !course.allowPreferredDateRequest) {
    return (
      <StateText text="Bookings are currently unavailable for this course." />
    );
  }
  if (done) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Request submitted</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          The school will review your booking and follow up.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/my/bookings" />}
          >
            View my bookings
          </Button>
          <Button size="sm" variant="outline" onClick={onSuccess}>
            Back to course
          </Button>
        </div>
      </div>
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutation.mutateAsync(form);
    setDone(true);
  }
  return (
    <form className="grid gap-3" onSubmit={submit}>
      {course.allowSessionBooking && course.allowPreferredDateRequest ? (
        <Tabs
          value={form.bookingMode}
          onValueChange={(value) =>
            setForm((current) => ({
              ...current,
              bookingMode:
                value as CreateStudentCourseBookingRequest["bookingMode"],
            }))
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="session">Choose a schedule</TabsTrigger>
            <TabsTrigger value="preferred_date">
              Request another date
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      {form.bookingMode === "session" ? (
        <SessionBookingFields
          sessions={sessions}
          sessionId={form.sessionId ?? ""}
          onChange={(sessionId) =>
            setForm((current) => ({ ...current, sessionId }))
          }
        />
      ) : (
        <PreferredDateFields form={form} setForm={setForm} />
      )}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Name">
          <Input
            value={form.studentName ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                studentName: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.studentEmail ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                studentEmail: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.studentPhone ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                studentPhone: event.target.value,
              }))
            }
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Experience">
          <Input
            value={form.experienceLevel ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                experienceLevel: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Certification">
          <Input
            value={form.certificationLevel ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                certificationLevel: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Equipment needs">
          <Input
            value={form.equipmentNeeds ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                equipmentNeeds: event.target.value,
              }))
            }
          />
        </Field>
      </div>
      <Field label="Note">
        <Textarea
          rows={4}
          value={form.studentNote ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              studentNote: event.target.value,
            }))
          }
        />
      </Field>
      {course.paymentRequired && activePaymentMethods.length > 0 ? (
        <div className="grid gap-3">
          <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
            Payment is required for this course. Use one of the school payment
            methods below and attach your receipt when the school asks for
            proof.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {activePaymentMethods.map((method) => (
              <PaymentMethodCustomerDisplay key={method.id} method={method} />
            ))}
          </div>
        </div>
      ) : null}
      {paidCourseUnavailable ? (
        <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
          This paid course is not ready for online booking because the school
          has not configured payment instructions yet.
        </p>
      ) : null}
      {mutation.isError ? (
        <p className="text-xs text-destructive">
          Could not submit booking. Check the date and try again.
        </p>
      ) : null}
      <Button
        type="submit"
        size="sm"
        disabled={
          mutation.isPending ||
          paidCourseUnavailable ||
          (form.bookingMode === "session" && !form.sessionId)
        }
      >
        {form.bookingMode === "session"
          ? "Book selected schedule"
          : "Submit request"}
      </Button>
    </form>
  );
}

function PreferredDateFields({
  form,
  setForm,
}: {
  form: CreateStudentCourseBookingRequest;
  setForm: React.Dispatch<
    React.SetStateAction<CreateStudentCourseBookingRequest>
  >;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Preferred date">
        <DatePicker
          required
          value={dateStringToDate(form.preferredDate)}
          onSelect={(date) =>
            setForm((current) => ({
              ...current,
              preferredDate: dateToDateString(date),
            }))
          }
        />
      </Field>
      <Field label="Alternate date">
        <DatePicker
          value={dateStringToDate(form.alternateDate)}
          onSelect={(date) =>
            setForm((current) => ({
              ...current,
              alternateDate: dateToDateString(date),
            }))
          }
        />
      </Field>
    </div>
  );
}

function SessionBookingFields({
  sessions,
  sessionId,
  onChange,
}: {
  sessions: PublicCourseSession[];
  sessionId: string;
  onChange: (sessionId: string) => void;
}) {
  const sessionItems = sessions
    .filter((session) => !session.isFull)
    .map((session) => ({
      value: session.id,
      label: sessionSelectLabel(session),
    }));
  return (
    <div className="grid gap-3">
      <Field label="Available schedules">
        <Select
          value={sessionId}
          onValueChange={(value) => onChange(value ?? "")}
          items={sessionItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose from available schedules" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sessionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      {sessions.length === 0 ? (
        <StateText text="No available schedules yet." />
      ) : null}
    </div>
  );
}

function AvailableSchedulesList({
  sessions,
  preferredDateEnabled,
  onBook,
}: {
  sessions: PublicCourseSession[];
  preferredDateEnabled: boolean;
  onBook: (sessionId: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="space-y-2">
        <StateText text="No available schedules yet." />
        {preferredDateEnabled ? (
          <p className="text-xs text-muted-foreground">
            You can still request another date.
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {sessions.map((session) => (
        <article
          key={session.id}
          className="flex flex-col gap-2 border-b border-border/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <h3 className="text-sm font-medium">{session.title}</h3>
            <p className="text-xs text-muted-foreground">
              {formatSessionWindow(session)}
              {session.locationLabel ? ` • ${session.locationLabel}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.slotsLeft === null
                ? "Open capacity"
                : `${session.slotsLeft} slots left`}
            </p>
          </div>
          {session.isFull ? (
            <Badge variant="secondary" className="self-start">
              Full
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => onBook(session.id)}
            >
              Book this schedule
            </Button>
          )}
        </article>
      ))}
    </div>
  );
}

function BookingRow({
  booking,
  onCancel,
}: {
  booking: MyCourseBooking;
  onCancel: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {booking.courseTitle}
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
        <p className="mt-1 text-xs text-muted-foreground">
          {booking.bookingMode === "session"
            ? booking.sessionTitle || "Schedule selected"
            : `Preferred ${booking.preferredDate}`}
          {booking.bookingMode === "preferred_date" && booking.alternateDate
            ? ` • Alternate ${booking.alternateDate}`
            : ""}
          {booking.bookingMode === "preferred_date" && booking.sessionTitle
            ? ` • Assigned ${booking.sessionTitle}`
            : ""}
        </p>
      </div>
      {["pending_review", "approved", "scheduled"].includes(booking.status) ? (
        <Button
          className="self-start"
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          <X />
          Cancel
        </Button>
      ) : null}
    </article>
  );
}

function FriendlySelect({
  value,
  placeholder,
  items,
  onValueChange,
}: {
  value: string;
  placeholder: string;
  items: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {(selected) => selected?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value || "all"} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function MarkdownBlock({ title, content }: { title: string; content: string }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {content ? (
        <ChikaMarkdown content={content} />
      ) : (
        <p className="text-xs text-muted-foreground">Not specified.</p>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Label className="grid gap-2 text-sm">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </Label>
  );
}

function SignInPrompt() {
  return (
    <CommunityEmptyState
      title="Sign in required"
      description="You need an account to request a course booking."
      action={
        <SignInButton mode="modal">
          <Button size="sm">Sign in</Button>
        </SignInButton>
      }
    />
  );
}

function StateText({ text }: { text: string }) {
  return <p className="text-xs leading-5 text-muted-foreground">{text}</p>;
}

function PageState({ text }: { text: string }) {
  return (
    <CommunityPageShell>
      <StateText text={text} />
    </CommunityPageShell>
  );
}
