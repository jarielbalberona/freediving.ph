export interface UserService {
  id: number;
  title: string;
  description: string;
  category: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
  price: number;
  currency: string;
  location: string;
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  rating: number;
  reviewCount: number;
  providerId: number;
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  imageUrl?: string;
  tags?: string[];
  requirements?: string;
  duration?: string;
  maxParticipants?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBooking {
  id: number;
  serviceId: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  bookingDate: string;
  notes?: string;
  totalPrice: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceReview {
  id: number;
  serviceId: number;
  userId: number;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  title: string;
  description: string;
  category: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
  price: number;
  currency: string;
  location: string;
  imageUrl?: string;
  tags?: string[];
  requirements?: string;
  duration?: string;
  maxParticipants?: number;
}

export interface UpdateServiceRequest {
  title?: string;
  description?: string;
  category?: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
  price?: number;
  currency?: string;
  location?: string;
  availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  imageUrl?: string;
  tags?: string[];
  requirements?: string;
  duration?: string;
  maxParticipants?: number;
  isActive?: boolean;
}

export interface CreateBookingRequest {
  serviceId: number;
  userId: number;
  bookingDate: string;
  notes?: string;
}

export interface UpdateBookingStatusRequest {
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

export interface CreateReviewRequest {
  serviceId: number;
  userId: number;
  rating: number;
  comment?: string;
}

export interface ServiceFilters {
  page?: number;
  limit?: number;
  category?: 'INSTRUCTION' | 'EQUIPMENT' | 'GUIDE' | 'PHOTOGRAPHY' | 'TRANSPORT' | 'OTHER';
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  search?: string;
  providerId?: number;
  isActive?: boolean;
}
