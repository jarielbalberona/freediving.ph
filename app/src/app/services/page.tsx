"use client";

import { useUser } from '@clerk/nextjs';
import { useServices } from '@/features/userServices';
import { ServiceList } from '@/features/userServices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary, FeatureErrorBoundary } from '@/components/error-boundary';
import { Briefcase, Plus, Filter, Search } from 'lucide-react';
import { useState } from 'react';

export default function ServicesPage() {
  const { user, isLoaded } = useUser();
  const [filters, setFilters] = useState({
    isActive: true,
    availability: 'AVAILABLE' as const,
    page: 1,
    limit: 20
  });

  const { data: services, isLoading } = useServices(filters);

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Services</h1>
            <p className="text-muted-foreground">
              Find and book freediving services from certified professionals.
            </p>
          </div>
          {user && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Offer Service
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Services List */}
        <FeatureErrorBoundary featureName="services">
          <Card>
            <CardHeader>
              <CardTitle>Available Services</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceList
                filters={filters}
                onServiceBook={(id) => console.log('Book service:', id)}
                onServiceView={(id) => console.log('View service:', id)}
              />
            </CardContent>
          </Card>
        </FeatureErrorBoundary>
      </div>
    </div>
  );
}
