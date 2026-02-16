"use client";

import { DiveSpot } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Thermometer, Waves, Eye, Anchor } from 'lucide-react';

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
        return 'bg-green-100 text-green-800';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ADVANCED':
        return 'bg-orange-100 text-orange-800';
      case 'EXPERT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'POOR':
        return 'bg-red-100 text-red-800';
      case 'FAIR':
        return 'bg-yellow-100 text-yellow-800';
      case 'GOOD':
        return 'bg-blue-100 text-blue-800';
      case 'EXCELLENT':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentColor = (current: string) => {
    switch (current) {
      case 'NONE':
        return 'bg-green-100 text-green-800';
      case 'LIGHT':
        return 'bg-blue-100 text-blue-800';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'STRONG':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg line-clamp-2">{diveSpot.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(diveSpot.difficulty)}`}>
                {diveSpot.difficulty}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVisibilityColor(diveSpot.visibility)}`}>
                {diveSpot.visibility}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCurrentColor(diveSpot.current)}`}>
                {diveSpot.current}
              </span>
              {diveSpot.isVerified && (
                <Badge variant="outline" className="text-xs">
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
