"use client";

import { useUser } from '@clerk/nextjs';
import { useDiveSpots } from '@/features/diveSpots';
import { DiveSpotList } from '@/features/diveSpots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary, FeatureErrorBoundary } from '@/components/error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Plus, Filter, Search, List, Map } from 'lucide-react';
import { useState } from 'react';
import ExploreView from './explore-view';

export default function ExplorePage() {
  const { user, isLoaded } = useUser();
  const { data: diveSpots, isLoading } = useDiveSpots();

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
            <h1 className="text-3xl font-bold">Explore Dive Spots</h1>
            <p className="text-muted-foreground">
              Discover amazing freediving locations around the world.
            </p>
          </div>
          {user && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Dive Spot
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dive spots..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Dive Spots with Tabs */}
        <FeatureErrorBoundary featureName="dive-spots">
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Map View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Featured Dive Spots</CardTitle>
                </CardHeader>
                <CardContent>
                  <DiveSpotList
                    onDiveSpotView={(id) => console.log('View dive spot:', id)}
                    onDiveSpotReview={(id) => console.log('Review dive spot:', id)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <div className="h-[850px] rounded-lg overflow-hidden">
                <ExploreView initialDiveSpots={diveSpots?.data?.data} />
              </div>
            </TabsContent>
          </Tabs>
        </FeatureErrorBoundary>
      </div>
    </div>
  );
}
