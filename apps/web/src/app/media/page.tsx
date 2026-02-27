"use client";

import { AuthGuard } from "@/components/auth/guard";
import { FeatureErrorBoundary } from "@/components/error-boundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaList, MediaUploadPanel } from "@/features/media";

export default function MediaPage() {
  return (
    <AuthGuard title="Sign in to view media" description="Please sign in to browse your media gallery.">
      <div className="container mx-auto space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-bold">Media Gallery</h1>
          <p className="text-muted-foreground">
            Upload originals once, then render optimized signed views via CDN presets.
          </p>
        </header>

        <FeatureErrorBoundary featureName="media">
          <Card>
            <CardHeader>
              <CardTitle>Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUploadPanel />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Media</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaList />
            </CardContent>
          </Card>
        </FeatureErrorBoundary>
      </div>
    </AuthGuard>
  );
}
