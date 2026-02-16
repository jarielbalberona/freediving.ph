"use client";

import { UserProfile } from '@freediving.ph/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Star, Award, Users, Calendar } from 'lucide-react';

interface UserCardProps {
  user: UserProfile;
  onViewProfile?: (userId: number) => void;
  onSendMessage?: (userId: number) => void;
  showActions?: boolean;
}

export function UserCard({
  user,
  onViewProfile,
  onSendMessage,
  showActions = true
}: UserCardProps) {
  const getExperienceColor = (experience: string) => {
    switch (experience) {
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'destructive';
      case 'EDITOR':
        return 'secondary';
      case 'USER':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-lg">{user.firstName} {user.lastName}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">@{user.username}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExperienceColor(user.experience)}`}>
                  {user.experience}
                </span>
                {user.isVerified && (
                  <Badge variant="outline" className="text-xs">
                    Verified
                  </Badge>
                )}
                <Badge variant={getRoleColor(user.role)} className="text-xs">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              {onViewProfile && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewProfile(user.id)}
                >
                  View
                </Button>
              )}
              {onSendMessage && (
                <Button
                  size="sm"
                  onClick={() => onSendMessage(user.id)}
                >
                  Message
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {user.bio && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {user.bio}
          </p>
        )}

        <div className="space-y-2">
          {user.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{user.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(user.createdAt)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{user.stats.totalDives} dives</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-500" />
              <span>{user.stats.maxDepth}m max depth</span>
            </div>
          </div>
        </div>

        {user.certifications && user.certifications.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Certifications:</div>
            <div className="flex flex-wrap gap-1">
              {user.certifications.slice(0, 3).map((cert, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {cert}
                </Badge>
              ))}
              {user.certifications.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{user.certifications.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {user.specialties && user.specialties.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Specialties:</div>
            <div className="flex flex-wrap gap-1">
              {user.specialties.slice(0, 3).map((specialty, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
              {user.specialties.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{user.specialties.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
