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
import { useAuth, SignInButton } from "@clerk/nextjs";
import type {
  CourseLevel,
  CourseType,
  CreateStudentCourseBookingRequest,
  MyCourseBooking,
  PublicCourse,
  PublicCourseFilters,
  PublicSchool,
  PublicSchoolFilters,
} from "@freediving.ph/types";
import { ArrowLeft, CalendarPlus, Search, X } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";
import {
  bookingStatusLabels,
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
  const [bookingOpen, setBookingOpen] = useState(false);
  const data = query.data;
  if (query.isError) return <PageState text="Course not found." />;
  if (!data) return <PageState text="Loading course..." />;
  const { school, course } = data;
  return (
    <SchoolPublicShell school={school} compact>
      <div className="flex flex-col gap-3 border-y border-border/70 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {course.title}
          </h1>
          <CourseMeta course={course} school={school} />
        </div>
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
            onSuccess={() => setBookingOpen(false)}
          />
        </Dialog>
      </div>
      <Tabs defaultValue="overview" className="gap-3">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
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
          <p className="text-sm text-muted-foreground">
            {course.availabilityNote ||
              "Choose your preferred date when booking."}
          </p>
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
              Send a request with your preferred date. The school will review it
              and assign an actual session later.
            </p>
            <Button size="sm" onClick={() => setBookingOpen(true)}>
              Request a date
            </Button>
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
      : new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: course.currency || "PHP",
        }).format(course.priceAmount);
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
  onSuccess,
}: {
  school: PublicSchool;
  course: PublicCourse;
  onSuccess: () => void;
}) {
  return (
    <DialogContent className="max-w-2xl!">
      <DialogHeader>
        <DialogTitle>Book {course.title}</DialogTitle>
      </DialogHeader>
      <BookingForm school={school} course={course} onSuccess={onSuccess} />
    </DialogContent>
  );
}

function BookingForm({
  school,
  course,
  onSuccess,
}: {
  school: PublicSchool;
  course: PublicCourse;
  onSuccess: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const mutation = useCreateStudentBooking(school.slug, course.slug);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<CreateStudentCourseBookingRequest>({
    preferredDate: "",
  });
  if (isLoaded && !isSignedIn) return <SignInPrompt />;
  if (done) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Request submitted</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          The school will review your preferred date and follow up.
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
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Preferred date">
          <Input
            required
            type="date"
            value={form.preferredDate}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                preferredDate: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Alternate date">
          <Input
            type="date"
            value={form.alternateDate ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                alternateDate: event.target.value,
              }))
            }
          />
        </Field>
      </div>
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
      {course.paymentRequired ? (
        <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Payment is required for this course. Submit the request now; payment
          proof review is handled by the school after request intake.
        </p>
      ) : null}
      {mutation.isError ? (
        <p className="text-xs text-destructive">
          Could not submit booking. Check the date and try again.
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={mutation.isPending}>
        Submit request
      </Button>
    </form>
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
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Preferred {booking.preferredDate}
          {booking.sessionTitle ? ` • ${booking.sessionTitle}` : ""}
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
