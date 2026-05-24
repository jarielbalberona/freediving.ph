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
import { CalendarPlus, Search, X } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal">Schools</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Find freediving schools, instructors, and courses around the
          Philippines.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
        <div className="relative">
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
          items={[{ value: "", label: "All course types" }, ...courseTypeOptions]}
          onValueChange={(courseType) =>
            setFilters((current) => ({
              ...current,
              courseType: courseType as CourseType | "",
            }))
          }
        />
      </div>
      {query.isLoading ? <StateText text="Loading schools..." /> : null}
      {query.isError ? <StateText text="Could not load schools." /> : null}
      {!query.isLoading && schools.length === 0 ? (
        <EmptyState
          title="No schools found"
          body="Try changing your search or location."
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {schools.map((school) => (
          <SchoolCard key={school.id} school={school} />
        ))}
      </div>
    </main>
  );
}

export function SchoolProfilePage({ slug }: { slug: string }) {
  const schoolQuery = usePublicSchool(slug);
  const coursesQuery = usePublicCourses(slug);
  const school = schoolQuery.data;
  const courses = coursesQuery.data?.courses ?? [];
  if (schoolQuery.isError) return <StateText text="School not found." />;
  if (!school) return <StateText text="Loading school..." />;
  return (
    <SchoolPublicShell school={school}>
      <Tabs defaultValue="overview" className="gap-5">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-5">
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {school.shortDescription || "Course offerings are available now."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href={`/schools/${school.slug}/courses`} />}>
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
  if (query.isError) return <StateText text="School not found." />;
  if (!school) return <StateText text="Loading courses..." />;
  return (
    <SchoolPublicShell school={school} compact>
      <div className="grid gap-3 md:grid-cols-[1fr_190px_170px_170px]">
        <Input
          placeholder="Search courses"
          value={filters.search ?? ""}
          onChange={(event) =>
            setFilters((current) => ({ ...current, search: event.target.value }))
          }
        />
        <FriendlySelect
          value={filters.courseType ?? ""}
          placeholder="All course types"
          items={[{ value: "", label: "All course types" }, ...courseTypeOptions]}
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
            setFilters((current) => ({ ...current, level: level as CourseLevel | "" }))
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
  if (query.isError) return <StateText text="Course not found." />;
  if (!data) return <StateText text="Loading course..." />;
  const { school, course } = data;
  return (
    <SchoolPublicShell school={school} compact>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">
            {course.title}
          </h1>
          <CourseMeta course={course} />
        </div>
        <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
          <DialogTrigger
            render={
              <Button>
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
      <Tabs defaultValue="overview" className="gap-5">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="included">What&apos;s included</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="book">Book</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {course.shortDescription}
          </p>
          {course.descriptionMarkdown ? (
            <ChikaMarkdown content={course.descriptionMarkdown} />
          ) : null}
        </TabsContent>
        <TabsContent value="schedule">
          <p className="text-sm text-muted-foreground">
            {course.availabilityNote || "Choose your preferred date when booking."}
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
          <MarkdownBlock title="Prerequisites" content={course.prerequisitesMarkdown} />
          <MarkdownBlock title="Equipment" content={course.equipmentMarkdown} />
          <MarkdownBlock
            title="Cancellation policy"
            content={course.cancellationPolicyMarkdown}
          />
        </TabsContent>
        <TabsContent value="book">
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Send a request with your preferred date. The school will review it
              and assign an actual session later.
            </p>
            <Button onClick={() => setBookingOpen(true)}>Request a date</Button>
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
  if (query.isError) return <StateText text="Course not found." />;
  if (!query.data) return <StateText text="Loading booking form..." />;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
      <SchoolPublicHeader school={query.data.school} compact />
      <BookingForm
        school={query.data.school}
        course={query.data.course}
        onSuccess={() => undefined}
      />
    </main>
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
          return booking.status === "cancelled" || booking.status === "rejected";
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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <SignInPrompt />
      </main>
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal">My bookings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track course requests, scheduled sessions, and payment review status.
        </p>
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>
      {query.isLoading ? <StateText text="Loading bookings..." /> : null}
      {!query.isLoading && visible.length === 0 ? (
        <EmptyState title="No bookings here" body="Course requests will appear here." />
      ) : null}
      <div className="grid gap-3">
        {visible.map((booking) => (
          <BookingRow
            key={booking.id}
            booking={booking}
            onCancel={() => cancelBooking.mutate(booking.id)}
          />
        ))}
      </div>
    </main>
  );
}

function SchoolCard({ school }: { school: PublicSchool }) {
  return (
    <article className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">{school.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {school.shortDescription || "Published freediving courses"}
          </p>
        </div>
        <Badge variant="secondary">{school.publishedCourseCount} courses</Badge>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {school.baseLocation || "Philippines"}
        {school.diveSiteName ? ` • ${school.diveSiteName}` : ""}
      </p>
      <Button
        className="mt-4"
        variant="outline"
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <SchoolPublicHeader school={school} compact={compact} />
      {children}
    </main>
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
    <header className={compact ? "space-y-2" : "space-y-3"}>
      <Link className="text-sm text-muted-foreground" href="/schools">
        Schools
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">
            {school.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {school.baseLocation || "Philippines"}
            {school.diveSiteName ? ` • ${school.diveSiteName}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href={`/schools/${school.slug}/courses`} />}
        >
          View courses
        </Button>
      </div>
    </header>
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
    return <EmptyState title="No courses found" body="Try different filters." />;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {courses.map((course) => (
        <article key={course.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium">{course.title}</h2>
            <Badge variant="secondary">{courseTypeLabels[course.courseType]}</Badge>
            {course.level ? (
              <Badge variant="outline">{courseLevelLabels[course.level]}</Badge>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {course.shortDescription}
          </p>
          <CourseMeta course={course} />
          <Button
            className="mt-4"
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

function CourseMeta({ course }: { course: PublicCourse }) {
  const price =
    course.priceAmount == null
      ? "Price on request"
      : new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: course.currency || "PHP",
        }).format(course.priceAmount);
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
      <span>{courseTypeLabels[course.courseType]}</span>
      {course.level ? <span>{courseLevelLabels[course.level]}</span> : null}
      {course.durationLabel ? <span>{course.durationLabel}</span> : null}
      <span>{course.paymentRequired ? price : "No payment required"}</span>
      {course.locationLabel ? <span>{course.locationLabel}</span> : null}
    </div>
  );
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
    <DialogContent className="max-w-2xl">
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
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Request submitted</h2>
        <p className="text-sm text-muted-foreground">
          The school will review your preferred date and follow up.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/my/bookings" />}>View my bookings</Button>
          <Button variant="outline" onClick={onSuccess}>
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
    <form className="grid gap-4" onSubmit={submit}>
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
              setForm((current) => ({ ...current, studentName: event.target.value }))
            }
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.studentEmail ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, studentEmail: event.target.value }))
            }
          />
        </Field>
        <Field label="Phone">
          <Input
            value={form.studentPhone ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, studentPhone: event.target.value }))
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
            setForm((current) => ({ ...current, studentNote: event.target.value }))
          }
        />
      </Field>
      {course.paymentRequired ? (
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Payment is required for this course. Submit the request now; payment
          proof review is handled by the school after request intake.
        </p>
      ) : null}
      {mutation.isError ? (
        <p className="text-sm text-destructive">
          Could not submit booking. Check the date and try again.
        </p>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
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
    <article className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{booking.courseTitle}</h2>
          <Badge variant="secondary">{bookingStatusLabels[booking.status]}</Badge>
          {booking.payment ? (
            <Badge variant="outline">
              {paymentStatusLabels[booking.payment.status]}
            </Badge>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Preferred {booking.preferredDate}
          {booking.sessionTitle ? ` • ${booking.sessionTitle}` : ""}
        </p>
      </div>
      {["pending_review", "approved", "scheduled"].includes(booking.status) ? (
        <Button variant="outline" onClick={onCancel}>
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
      <SelectTrigger>
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
      <h2 className="mb-2 font-medium">{title}</h2>
      {content ? (
        <ChikaMarkdown content={content} />
      ) : (
        <p className="text-sm text-muted-foreground">Not specified.</p>
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
      <span>{label}</span>
      {children}
    </Label>
  );
}

function SignInPrompt() {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-medium">Sign in required</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        You need an account to request a course booking.
      </p>
      <SignInButton mode="modal">
        <Button className="mt-4">Sign in</Button>
      </SignInButton>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function StateText({ text }: { text: string }) {
  return <p className="py-8 text-sm text-muted-foreground">{text}</p>;
}
