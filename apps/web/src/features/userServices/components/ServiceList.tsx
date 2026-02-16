"use client";

import { useServices } from '../hooks';
import { ServiceCard } from './ServiceCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Briefcase, Plus } from 'lucide-react';
import type { ServiceFilters } from '../types';

interface ServiceListProps {
  filters?: ServiceFilters;
  showCreateButton?: boolean;
  onServiceBook?: (serviceId: number) => void;
  onServiceView?: (serviceId: number) => void;
}

export function ServiceList({
  filters,
  showCreateButton = false,
  onServiceBook,
  onServiceView
}: ServiceListProps) {
  const { data, isLoading, error } = useServices(filters);

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
          Failed to load services. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const services = data ?? [];

  if (services.length === 0) {
    return (
      <div className="text-center py-8">
        <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No services found
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {filters?.search ? 'Try adjusting your search criteria.' : 'No services are currently available.'}
        </p>
        {showCreateButton && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Service
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onBook={onServiceBook}
          onViewDetails={onServiceView}
          showActions={!!onServiceBook || !!onServiceView}
        />
      ))}
    </div>
  );
}
