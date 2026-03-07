"use client";

import { UserService } from '@freediving.ph/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Users, Clock, DollarSign } from 'lucide-react';

interface ServiceCardProps {
  service: UserService;
  onBook?: (serviceId: number) => void;
  onViewDetails?: (serviceId: number) => void;
  showActions?: boolean;
}

export function ServiceCard({
  service,
  onBook,
  onViewDetails,
  showActions = true
}: ServiceCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'INSTRUCTION':
        return 'default';
      case 'EQUIPMENT':
        return 'secondary';
      case 'GUIDE':
        return 'outline';
      case 'PHOTOGRAPHY':
        return 'destructive';
      case 'TRANSPORT':
        return 'default';
      default:
        return 'default';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'AVAILABLE':
        return 'bg-success/15 text-success-foreground';
      case 'BUSY':
        return 'bg-warning/15 text-warning-foreground';
      case 'UNAVAILABLE':
        return 'bg-destructive/15 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-warning fill-current' : 'text-muted-foreground/40'
        }`}
      />
    ));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle>{service.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getCategoryColor(service.category)}>
                {service.category}
              </Badge>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(service.availability)}`}>
                {service.availability}
              </span>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              {onViewDetails && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDetails(service.id)}
                >
                  View
                </Button>
              )}
              {onBook && service.availability === 'AVAILABLE' && (
                <Button
                  size="sm"
                  onClick={() => onBook(service.id)}
                >
                  Book
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {service.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {service.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{service.location}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">{service.price} {service.currency}</span>
          </div>

          {service.duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{service.duration}</span>
            </div>
          )}

          {service.maxParticipants && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Max {service.maxParticipants} participants</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center">
              {renderStars(service.rating)}
            </div>
            <span className="text-muted-foreground">
              {service.rating.toFixed(1)} ({service.reviewCount} reviews)
            </span>
          </div>
        </div>

        {service.tags && service.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {service.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline">
                {tag}
              </Badge>
            ))}
            {service.tags.length > 3 && (
              <Badge variant="outline">
                +{service.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Provider:</span> {service.providerName}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
