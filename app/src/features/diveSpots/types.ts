export interface DiveSpot {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
  locationName?: string;
  depth?: number;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  description?: string;
  bestSeason?: string;
  imageUrl?: string;
  directions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiveSpotReview {
  id: number;
  diveSpotId: number;
  userId: number;
  userName: string;
  rating: number;
  comment?: string;
  diveDate: string;
  visibility: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterTemperature: number;
  current: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiveSpotRequest {
  name: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  visibility: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterType: 'FRESH' | 'SALT' | 'BRACKISH';
  temperature: number;
  current: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
  entryType: 'SHORE' | 'BOAT' | 'PLATFORM' | 'LADDER';
  facilities: string[];
  restrictions: string[];
  bestTime: string;
  imageUrl?: string;
  isPublic: boolean;
}

export interface UpdateDiveSpotRequest {
  name?: string;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  depth?: number;
  visibility?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterType?: 'FRESH' | 'SALT' | 'BRACKISH';
  temperature?: number;
  current?: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
  entryType?: 'SHORE' | 'BOAT' | 'PLATFORM' | 'LADDER';
  facilities?: string[];
  restrictions?: string[];
  bestTime?: string;
  imageUrl?: string;
  isPublic?: boolean;
}

export interface CreateDiveSpotReviewRequest {
  diveSpotId: number;
  userId: number;
  rating: number;
  comment?: string;
  diveDate: string;
  visibility: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterTemperature: number;
  current: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
}

export interface DiveSpotFilters {
  page?: number;
  limit?: number;
  location?: string;
  minDepth?: number;
  maxDepth?: number;
  visibility?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  waterType?: 'FRESH' | 'SALT' | 'BRACKISH';
  current?: 'NONE' | 'LIGHT' | 'MODERATE' | 'STRONG';
  entryType?: 'SHORE' | 'BOAT' | 'PLATFORM' | 'LADDER';
  search?: string;
  isPublic?: boolean;
  isVerified?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
}
