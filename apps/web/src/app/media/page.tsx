"use client";

import { MediaList } from '@/features/media';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeatureErrorBoundary } from '@/components/error-boundary';
import { Upload, Filter, Search } from 'lucide-react';

export default function MediaPage() {
  const filters = {
    isPublic: true,
    page: 1,
    limit: 20
  };

  return (
    <AuthGuard title="Sign in to view media" description="Please sign in to browse the media gallery.">
      <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Media Gallery</h1>
            <p className="text-muted-foreground">
              Browse and share freediving photos and videos.
            </p>
          </div>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search media..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Media List */}
        <FeatureErrorBoundary featureName="media">
          <Card>
            <CardHeader>
              <CardTitle>Recent Media</CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <MediaList
                filters={filters}
                onMediaView={(id) => console.log('View media:', id)}
                onMediaEdit={(id) => console.log('Edit media:', id)}
                onMediaDelete={(id) => console.log('Delete media:', id)}
                onMediaDownload={(id) => console.log('Download media:', id)}
              />
            </div>
          </Card>
        </FeatureErrorBoundary>
      </div>
      </div>
    </AuthGuard>
  );
}
