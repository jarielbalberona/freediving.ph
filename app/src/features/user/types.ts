export interface User {
  id: number;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  certifications: string[];
  specialties: string[];
  isActive: boolean;
  isVerified: boolean;
  role: 'USER' | 'EDITOR' | 'ADMINISTRATOR';
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    publicProfile: boolean;
    locationSharing: boolean;
  };
  stats: {
    totalDives: number;
    maxDepth: number;
    totalTime: number;
    favoriteSpots: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  certifications: string[];
  specialties: string[];
  isActive: boolean;
  isVerified: boolean;
  role: 'USER' | 'EDITOR' | 'ADMINISTRATOR';
  preferences: {
    notifications: boolean;
    emailUpdates: boolean;
    publicProfile: boolean;
    locationSharing: boolean;
  };
  stats: {
    totalDives: number;
    maxDepth: number;
    totalTime: number;
    favoriteSpots: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  experience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  certifications?: string[];
  specialties?: string[];
  preferences?: {
    notifications?: boolean;
    emailUpdates?: boolean;
    publicProfile?: boolean;
    locationSharing?: boolean;
  };
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  experience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  role?: 'USER' | 'EDITOR' | 'ADMINISTRATOR';
  isActive?: boolean;
  isVerified?: boolean;
}
