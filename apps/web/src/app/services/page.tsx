"use client";

import { ServiceList } from '@/features/userServices';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FeatureErrorBoundary } from '@/components/error-boundary';
import { Plus, Filter, Search } from 'lucide-react';

export default function ServicesPage() {
  const filters = {
    isActive: true,
    availability: 'AVAILABLE' as const,
    page: 1,
    limit: 20
  };

  return (
    <AuthGuard title="Sign in to view services" description="Please sign in to discover services.">
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Offer Service
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2"
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
            <div className="px-6 pb-6">
              <ServiceList
                filters={filters}
                onServiceBook={(id) => console.log('Book service:', id)}
                onServiceView={(id) => console.log('View service:', id)}
              />
            </div>
          </Card>
        </FeatureErrorBoundary>
      </div>
      </div>
    </AuthGuard>
  );
}
