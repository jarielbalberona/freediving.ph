export interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  maxAttendees?: number;
  currentAttendees: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  type: 'WORKSHOP' | 'COMPETITION' | 'SOCIAL' | 'TRAINING' | 'OTHER';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  price?: number;
  currency?: string;
  imageUrl?: string;
  organizerId: number;
  organizerName: string;
  organizerEmail: string;
  requirements?: string;
  equipment?: string;
  contactInfo?: string;
  tags?: string[];
  isPublic: boolean;
  allowWaitlist: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
  joinedAt: string;
  notes?: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  maxAttendees?: number;
  type: 'WORKSHOP' | 'COMPETITION' | 'SOCIAL' | 'TRAINING' | 'OTHER';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  price?: number;
  currency?: string;
  imageUrl?: string;
  requirements?: string;
  equipment?: string;
  contactInfo?: string;
  tags?: string[];
  isPublic: boolean;
  allowWaitlist: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  maxAttendees?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  type?: 'WORKSHOP' | 'COMPETITION' | 'SOCIAL' | 'TRAINING' | 'OTHER';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  price?: number;
  currency?: string;
  imageUrl?: string;
  requirements?: string;
  equipment?: string;
  contactInfo?: string;
  tags?: string[];
  isPublic?: boolean;
  allowWaitlist?: boolean;
}

export interface JoinEventRequest {
  eventId: number;
  userId: number;
  notes?: string;
}

export interface EventFilters {
  page?: number;
  limit?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  type?: 'WORKSHOP' | 'COMPETITION' | 'SOCIAL' | 'TRAINING' | 'OTHER';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  location?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  organizerId?: number;
  isPublic?: boolean;
}
