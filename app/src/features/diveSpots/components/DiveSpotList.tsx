"use client";

import { useDiveSpots } from '../hooks';
import { DiveSpotCard } from './DiveSpotCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Plus } from 'lucide-react';
import type { DiveSpotFilters } from '../types';

interface DiveSpotListProps {
  filters?: DiveSpotFilters;
  showCreateButton?: boolean;
  onDiveSpotView?: (diveSpotId: number) => void;
  onDiveSpotReview?: (diveSpotId: number) => void;
}

export function DiveSpotList({
  filters,
  showCreateButton = false,
  onDiveSpotView,
  onDiveSpotReview
}: DiveSpotListProps) {
  const { data, isLoading, error } = useDiveSpots(filters);


  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load dive spots. Please try again.
          <br />
          Error: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const diveSpots = Array.isArray(data?.data?.data) ? data.data.data : [];

  if (diveSpots.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No dive spots found
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {filters?.search ? 'Try adjusting your search criteria.' : 'No dive spots are currently available.'}
        </p>
        {showCreateButton && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Dive Spot
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diveSpots.map((diveSpot) => (
        <DiveSpotCard
          key={diveSpot.id}
          diveSpot={diveSpot}
          onViewDetails={onDiveSpotView}
          onAddReview={onDiveSpotReview}
          showActions={!!onDiveSpotView || !!onDiveSpotReview}
        />
      ))}
    </div>
  );
}
