"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EventList } from '@/features/events';
import { useJoinEvent, useLeaveEvent, useCreateEvent } from '@/features/events';
import { buildDisplayLocation, LocationSearch, type LocationSearchValue } from '@/features/locations';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FeatureErrorBoundary } from '@/components/error-boundary';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/http/api-error';
import { useMemo, useState } from 'react';

const createEventSchema = z
  .object({
    title: z.string().min(3, 'Event title must be at least 3 characters'),
    description: z.string().optional(),
    location: z.string().optional(),
    locationData: z
      .object({
        locationName: z.string().optional(),
        formattedAddress: z.string().optional(),
        regionCode: z.string().optional(),
        regionName: z.string().optional(),
        provinceCode: z.string().optional(),
        provinceName: z.string().optional(),
        cityCode: z.string().optional(),
        cityName: z.string().optional(),
        barangayCode: z.string().optional(),
        barangayName: z.string().optional(),
        locationSource: z.enum(['manual', 'google_places', 'psgc_mapped', 'unmapped']).optional(),
      })
      .optional(),
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
  })
  .refine((data) => !data.endsAt || !data.startsAt || data.endsAt >= data.startsAt, {
    message: 'End date must be on or after start date',
    path: ['endsAt'],
  });

type CreateEventValues = z.infer<typeof createEventSchema>;

const createEventDefaultValues: CreateEventValues = {
  title: '',
  description: '',
  location: '',
  locationData: {
    locationName: '',
    formattedAddress: '',
    locationSource: 'manual',
  },
  startsAt: undefined,
  endsAt: undefined,
};

export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'published' | ''>('published');
  const [createOpen, setCreateOpen] = useState(false);
  const filters = useMemo(
    () => ({
      status: status || undefined,
      page: 1,
      limit: 20,
      search: search || undefined,
    }),
    [search, status],
  );

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const form = useForm<CreateEventValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: createEventDefaultValues,
  });

  const joinEventMutation = useJoinEvent();
  const leaveEventMutation = useLeaveEvent();
  const createEventMutation = useCreateEvent();

  const handleJoinEvent = (eventId: string) => {
    joinEventMutation.mutate(
      { eventId },
      {
        onError: (error) => {
          const statusCode = getApiErrorStatus(error);
          if (statusCode === 401 || statusCode === 403) {
            toast.error('You do not have permission to join this event.');
            return;
          }
          toast.error(getApiErrorMessage(error, 'Failed to join event'));
        },
      },
    );
  };

  const handleLeaveEvent = (eventId: string) => {
    leaveEventMutation.mutate(
      { eventId },
      {
        onError: (error) => {
          const statusCode = getApiErrorStatus(error);
          if (statusCode === 401 || statusCode === 403) {
            toast.error('You do not have permission to leave this event.');
            return;
          }
          toast.error(getApiErrorMessage(error, 'Failed to leave event'));
        },
      },
    );
  };

  const onCreateEventSubmit = (values: CreateEventValues) => {
    const locationData = values.locationData ?? {};
    const structuredLocation = buildDisplayLocation(locationData as LocationSearchValue);
    const location = values.location?.trim() || structuredLocation || locationData.formattedAddress?.trim() || undefined;

    createEventMutation.mutate(
      {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        location,
        locationName: locationData.locationName?.trim() || undefined,
        formattedAddress: locationData.formattedAddress?.trim() || undefined,
        regionCode: locationData.regionCode?.trim() || undefined,
        provinceCode: locationData.provinceCode?.trim() || undefined,
        cityCode: locationData.cityCode?.trim() || undefined,
        barangayCode: locationData.barangayCode?.trim() || undefined,
        locationSource: locationData.locationSource || undefined,
        startsAt: values.startsAt?.toISOString(),
        endsAt: values.endsAt?.toISOString(),
        status: 'published',
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          form.reset(createEventDefaultValues);
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Failed to create event'));
        },
      },
    );
  };

  return (
    <AuthGuard title="Sign in to view events" description="Please sign in to see and join events.">
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Events</h1>
              <p className="text-muted-foreground">Discover and join freediving events in your area.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-10 pr-4 py-2"
              />
            </div>
            <Button variant="outline" onClick={() => setStatus((current) => (current ? '' : 'published'))}>
              <Filter className="h-4 w-4 mr-2" />
              {status ? 'Show All Statuses' : 'Status: Published'}
            </Button>
          </div>

          <FeatureErrorBoundary featureName="events">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                <EventList filters={filters} onEventJoin={handleJoinEvent} onEventLeave={handleLeaveEvent} joinedEventIds={[]} />
              </div>
            </Card>
          </FeatureErrorBoundary>
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset(createEventDefaultValues);
        }}
      >
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateEventSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cebu Open Water Training" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Weekly pool session for all levels" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationData"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <LocationSearch
                        value={(field.value ?? {
                          locationName: '',
                          formattedAddress: '',
                          locationSource: 'manual',
                        }) as LocationSearchValue}
                        onChange={field.onChange}
                        disabled={createEventMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <DatePicker
                        placeholder="e.g. Mar 15, 2025"
                        value={field.value}
                        min={todayStart}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <DatePicker
                        placeholder="e.g. Mar 16, 2025"
                        value={field.value}
                        min={form.watch('startsAt') ?? todayStart}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
