"use client";

import { DiveSpot } from '@freediving.ph/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Waves, Eye } from 'lucide-react';

interface DiveSpotCardProps {
  diveSpot: DiveSpot;
  onViewDetails?: (diveSpotId: number) => void;
  onAddReview?: (diveSpotId: number) => void;
  showActions?: boolean;
}

export function DiveSpotCard({
  diveSpot,
  onViewDetails,
  onAddReview,
  showActions = true
}: DiveSpotCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-success/15 text-success-foreground';
      case 'INTERMEDIATE':
        return 'bg-info/15 text-info-foreground';
      case 'ADVANCED':
        return 'bg-warning/15 text-warning-foreground';
      case 'EXPERT':
        return 'bg-destructive/15 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'POOR':
        return 'bg-destructive/15 text-destructive';
      case 'FAIR':
        return 'bg-warning/15 text-warning-foreground';
      case 'GOOD':
        return 'bg-info/15 text-info-foreground';
      case 'EXCELLENT':
        return 'bg-success/15 text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCurrentColor = (current: string) => {
    switch (current) {
      case 'NONE':
        return 'bg-success/15 text-success-foreground';
      case 'LIGHT':
        return 'bg-info/15 text-info-foreground';
      case 'MODERATE':
        return 'bg-warning/15 text-warning-foreground';
      case 'STRONG':
        return 'bg-destructive/15 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle>{diveSpot.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(diveSpot.difficulty ?? 'BEGINNER')}`}>
                {diveSpot.difficulty ?? 'BEGINNER'}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisibilityColor(diveSpot.visibility ?? 'GOOD')}`}>
                {diveSpot.visibility ?? 'GOOD'}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCurrentColor(diveSpot.current ?? 'LIGHT')}`}>
                {diveSpot.current ?? 'LIGHT'}
              </span>
              {diveSpot.isVerified && (
                <Badge variant="outline">
                  Verified
                </Badge>
              )}
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              {onViewDetails && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails(diveSpot.id)}
                >
                  View
                </Button>
              )}
              {onAddReview && (
                <Button
                  size="sm"
                  onClick={() => onAddReview(diveSpot.id)}
                >
                  Review
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {diveSpot.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {diveSpot.description}
          </p>
        )}

        <div className="space-y-2">
          {diveSpot.locationName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{diveSpot.locationName}</span>
            </div>
          )}

          {diveSpot.depth && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Waves className="h-4 w-4" />
              <span>{diveSpot.depth}m depth</span>
            </div>
          )}

          {diveSpot.bestSeason && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>Best season: {diveSpot.bestSeason}</span>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
