# Freediving.ph System Design Plan

## 🎯 Core Concept
**All users can be both service providers AND customers**
- Users can offer services (buddy, photographer, etc.)
- Users can book services from other users
- All users have personal tags for profiles
- All users can have multiple service offerings

## 📊 Database Design

### 1. USERS (Enhanced)
```typescript
users: {
  id: serial primary key,
  clerkId: text unique not null,
  name: text,
  username: text unique,
  email: text unique,
  image: text,
  role: role_type default 'USER',
  alias: text unique,
  // Profile information
  bio: text,
  location: text,
  phone: text,
  website: text,
  // Service provider status
  isServiceProvider: boolean default false,
  // Timestamps
  createdAt, updatedAt
}
```

### 2. TAGS (Dynamic Tag System)
```typescript
tags: {
  id: serial primary key,
  name: varchar(50) unique not null,
  category: varchar(50) not null, // 'skill', 'location', 'interest', 'certification'
  emoji: varchar(10) not null,
  isApproved: boolean default false, // Admin approval
  suggestedBy: integer references users(id), // Who suggested it
  approvedBy: integer references users(id), // Admin who approved
  usageCount: integer default 0, // How many users use this tag
  createdAt, updatedAt
}
```

### 3. USER_TAGS (Personal Profile Tags)
```typescript
userTags: {
  userId: integer references users(id),
  tagId: integer references tags(id),
  isTopTag: boolean default false,
  // Primary key: (userId, tagId)
}
```

### 4. SERVICE_TYPES (Dynamic Service System)
```typescript
serviceTypes: {
  id: serial primary key,
  name: varchar(50) unique not null, // 'Buddy', 'Photographer', 'Videographer'
  description: text,
  emoji: varchar(10) not null,
  isApproved: boolean default false, // Admin approval
  suggestedBy: integer references users(id), // Who suggested it
  approvedBy: integer references users(id), // Admin who approved
  usageCount: integer default 0, // How many users offer this service
  createdAt, updatedAt
}
```

### 5. SERVICE_AREAS (Service Location Management)
```typescript
serviceAreas: {
  id: serial primary key,
  serviceId: integer references userServices(id),
  name: text not null, // "Anilao, Batangas"
  lat: decimal(10,8),
  lng: decimal(11,8),
  isPrimary: boolean default false, // Primary service location
  travelFee: decimal(10,2) default 0, // Additional fee for this location
  notes: text, // Special notes for this location
  createdAt, updatedAt
}
```

### 6. USER_SERVICES (Service Offerings)
```typescript
userServices: {
  id: serial primary key,
  userId: integer references users(id),
  serviceTypeId: integer references serviceTypes(id), // Dynamic service type
  isAvailable: boolean default true,

  // Service Details
  title: text not null,
  description: text,
  rate: decimal(10,2),
  currency: text default 'PHP',
  rateType: text, // 'per_hour', 'per_day', 'per_session'

  // Experience
  experienceLevel: experience_level default 'INTERMEDIATE',
  yearsExperience: integer,
  skills: text[], // ["Deep Diving", "Safety Diver"]
  certifications: text[], // ["PADI Advanced", "Rescue Diver"]
  specialties: text[], // ["Wedding Photography", "Marine Biology"]

  // Service Area Settings
  maxTravelDistance: integer, // km radius from primary location
  defaultTravelFee: decimal(10,2), // Default travel fee for non-primary areas

  // Service Specifics
  maxDepth: integer, // meters
  equipmentProvided: boolean default false,
  equipmentDetails: text, // What equipment is provided

  // Contact & Portfolio
  portfolioUrl: text,
  contactInfo: jsonb, // Phone, email, social media

  // Availability
  availableDays: text[], // ["Monday", "Tuesday", "Weekends"]
  availableTimes: text, // "9AM-5PM"

  // Settings
  settings: jsonb, // Service-specific configurations

  createdAt, updatedAt
}
```

### 7. TAG_SUGGESTIONS (User Tag Suggestions)
```typescript
tagSuggestions: {
  id: serial primary key,
  suggestedBy: integer references users(id),
  name: varchar(50) not null,
  category: varchar(50) not null,
  emoji: varchar(10) not null,
  reason: text, // Why this tag should be added
  status: text default 'PENDING', // PENDING, APPROVED, REJECTED
  reviewedBy: integer references users(id), // Admin who reviewed
  reviewedAt: timestamp,
  createdAt, updatedAt
}
```

### 8. SERVICE_SUGGESTIONS (User Service Suggestions)
```typescript
serviceSuggestions: {
  id: serial primary key,
  suggestedBy: integer references users(id),
  name: varchar(50) not null,
  description: text,
  emoji: varchar(10) not null,
  reason: text, // Why this service should be added
  status: text default 'PENDING', // PENDING, APPROVED, REJECTED
  reviewedBy: integer references users(id), // Admin who reviewed
  reviewedAt: timestamp,
  createdAt, updatedAt
}
```

### 9. SERVICE_BOOKINGS (Booking System)
```typescript
serviceBookings: {
  id: serial primary key,
  serviceId: integer references userServices(id),
  clientId: integer references users(id), // Who is booking
  providerId: integer references users(id), // Who is providing service

  // Booking Details
  bookingDate: timestamp not null,
  duration: integer, // minutes
  location: text,
  notes: text,

  // Pricing
  rate: decimal(10,2),
  totalAmount: decimal(10,2),
  currency: text default 'PHP',

  // Status
  status: text default 'PENDING', // PENDING, CONFIRMED, COMPLETED, CANCELLED
  paymentStatus: text default 'PENDING', // PENDING, PAID, REFUNDED

  // Timestamps
  createdAt, updatedAt
}
```

### 10. SERVICE_REVIEWS (Rating System)
```typescript
serviceReviews: {
  id: serial primary key,
  serviceId: integer references userServices(id),
  bookingId: integer references serviceBookings(id),
  reviewerId: integer references users(id), // Who wrote the review
  revieweeId: integer references users(id), // Who is being reviewed

  rating: integer not null, // 1-5 stars
  review: text,

  // Review categories
  communicationRating: integer, // 1-5
  punctualityRating: integer, // 1-5
  skillRating: integer, // 1-5

  createdAt, updatedAt
}
```

## 🏢 Multiple Service Areas Examples

### Maria's Buddy Service (Multiple Locations):
```json
{
  "serviceId": 123,
  "title": "Professional Dive Buddy",
  "rate": 1500.00,
  "serviceAreas": [
    {
      "name": "Anilao, Batangas",
      "lat": 13.7234,
      "lng": 120.7890,
      "isPrimary": true,
      "travelFee": 0.00,
      "notes": "Home base - no travel fee"
    },
    {
      "name": "Puerto Galera, Oriental Mindoro",
      "lat": 13.5000,
      "lng": 120.9500,
      "isPrimary": false,
      "travelFee": 500.00,
      "notes": "Weekend trips available"
    },
    {
      "name": "Coron, Palawan",
      "lat": 12.0000,
      "lng": 120.2000,
      "isPrimary": false,
      "travelFee": 1000.00,
      "notes": "Special events only"
    }
  ]
}
```

### John's Photography Service (Multiple Locations):
```json
{
  "serviceId": 456,
  "title": "Underwater Photographer",
  "rate": 3000.00,
  "serviceAreas": [
    {
      "name": "Anilao, Batangas",
      "lat": 13.7234,
      "lng": 120.7890,
      "isPrimary": true,
      "travelFee": 0.00,
      "notes": "Main location - full equipment available"
    },
    {
      "name": "Puerto Galera, Oriental Mindoro",
      "lat": 13.5000,
      "lng": 120.9500,
      "isPrimary": false,
      "travelFee": 800.00,
      "notes": "Limited equipment - advance notice required"
    }
  ]
}
```

## 🔄 User Flow Examples

### Scenario 1: Maria (Service Provider)
```json
{
  "user": {
    "name": "Maria Santos",
    "isServiceProvider": true,
    "bio": "Professional freediver and underwater photographer",
    "location": "Anilao, Batangas"
  },
  "personalTags": ["Deep Diving", "Safety Diver", "Anilao", "Marine Biology"],
  "services": [
    {
      "serviceType": "BUDDY",
      "title": "Professional Dive Buddy",
      "rate": 1500.00,
      "rateType": "per_day",
      "serviceArea": "Anilao, Batangas",
      "skills": ["Deep Diving", "Safety Diver", "Rescue Certified"],
      "maxDepth": 40,
      "equipmentProvided": false
    },
    {
      "serviceType": "PHOTOGRAPHER",
      "title": "Underwater Photographer",
      "rate": 3000.00,
      "rateType": "per_session",
      "skills": ["Reef Photography", "Macro Photography"],
      "equipmentProvided": true,
      "portfolioUrl": "https://maria-photos.com"
    }
  ]
}
```

### Scenario 2: John (Customer)
```json
{
  "user": {
    "name": "John Smith",
    "isServiceProvider": false,
    "bio": "New to freediving, looking for buddies",
    "location": "Manila"
  },
  "personalTags": ["Beginner", "Manila", "Weekend Diver"],
  "services": [], // No services offered
  "bookings": [
    {
      "serviceId": 123, // Maria's buddy service
      "bookingDate": "2024-01-15",
      "status": "CONFIRMED"
    }
  ]
}
```

## 🎯 Key Features

### 1. Dynamic Tag & Service System
- **User Suggestions**: Users can suggest new tags and services
- **Admin Approval**: Admins review and approve suggestions
- **Auto-population**: Approved suggestions become available to all users
- **Usage Tracking**: Track how popular tags/services are
- **Moderation**: Prevent spam and inappropriate content

### 2. Dual Role System
- **Service Providers**: Can offer multiple services
- **Customers**: Can book services from providers
- **Both**: All users have personal tags and profiles

### 3. Service Management
- **Multiple Services**: One user can offer buddy + photographer services
- **Service Areas**: Geographic coverage with lat/lng
- **Flexible Pricing**: Per hour, per day, per session
- **Equipment**: Track what equipment is provided

### 4. Booking System
- **Direct Booking**: Customers book services from providers
- **Status Tracking**: PENDING → CONFIRMED → COMPLETED
- **Payment Integration**: Track payment status
- **Reviews**: Rate both service and provider

### 5. Search & Discovery
- **By Service Type**: Find all buddy services
- **By Location**: Find services in Anilao
- **By Skills**: Find photographers with "Reef Photography"
- **By Price Range**: Filter by rate
- **By Availability**: Filter by available days/times

## 🔄 Dynamic Features Workflow

### Tag Suggestion Flow:
1. **User suggests tag**: "Underwater Videography" with emoji 🎥
2. **Admin reviews**: Checks if appropriate and not duplicate
3. **Admin approves**: Tag becomes available to all users
4. **Auto-population**: Tag appears in tag selection dropdowns
5. **Usage tracking**: Count how many users adopt the new tag

### Service Suggestion Flow:
1. **User suggests service**: "Dive Equipment Rental" with description
2. **Admin reviews**: Validates service type and description
3. **Admin approves**: Service type becomes available
4. **Auto-population**: Service appears in service type dropdowns
5. **Usage tracking**: Count how many users offer this service

### Admin Management:
- **Pending suggestions**: Queue of user suggestions to review
- **Approval workflow**: One-click approve/reject with reason
- **Usage analytics**: See which tags/services are most popular
- **Moderation tools**: Remove inappropriate content

## 🔍 Query Examples

### Find Buddy Services in Anilao
```sql
SELECT u.name, u.image, us.title, us.rate, us.skills, sa.name as serviceArea, sa.travelFee, st.name as serviceType
FROM users u
JOIN userServices us ON u.id = us.userId
JOIN serviceTypes st ON us.serviceTypeId = st.id
JOIN serviceAreas sa ON us.id = sa.serviceId
WHERE st.name = 'Buddy'
AND sa.name ILIKE '%Anilao%'
AND us.isAvailable = true;
```

### Find Photographers with Equipment
```sql
SELECT u.name, us.title, us.rate, us.equipmentDetails, sa.name as serviceArea, sa.travelFee, st.name as serviceType
FROM users u
JOIN userServices us ON u.id = us.userId
JOIN serviceTypes st ON us.serviceTypeId = st.id
LEFT JOIN serviceAreas sa ON us.id = sa.serviceId AND sa.isPrimary = true
WHERE st.name = 'Photographer'
AND us.equipmentProvided = true;
```

### Get User's Complete Profile
```sql
-- User info + personal tags
SELECT u.*, ARRAY_AGG(t.name) as personalTags
FROM users u
LEFT JOIN userTags ut ON u.id = ut.userId
LEFT JOIN tags t ON ut.tagId = t.id
WHERE u.id = 123
GROUP BY u.id;

-- User's services with all areas
SELECT us.*, st.name as serviceType,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'areaName', sa.name,
      'lat', sa.lat,
      'lng', sa.lng,
      'isPrimary', sa.isPrimary,
      'travelFee', sa.travelFee,
      'notes', sa.notes
    )
  ) as serviceAreas
FROM userServices us
JOIN serviceTypes st ON us.serviceTypeId = st.id
LEFT JOIN serviceAreas sa ON us.id = sa.serviceId
WHERE us.userId = 123
GROUP BY us.id, st.name;
```

## 🚀 Implementation Benefits

1. **Flexible**: Users can be providers, customers, or both
2. **Comprehensive**: Full booking and review system
3. **Searchable**: Multiple filter options
4. **Scalable**: Easy to add new service types
5. **User-Friendly**: Clear separation of personal vs service data

## 📱 Frontend Pages

### 1. User Profile
- Personal info + tags
- Services offered (if any)
- Reviews received
- Bookings made
- **Suggest new tags/services** button

### 2. Services Directory (/buddies, /photographers, etc.)
- Filter by service type (dynamic list)
- Filter by location
- Filter by skills (dynamic tags)
- Filter by price range
- **"Don't see your service type? Suggest it!"** link

### 3. Service Details
- Provider info
- Service details
- Reviews
- Booking form

### 4. Booking Management
- My bookings (as customer)
- My services (as provider)
- Booking requests
- Reviews to write

### 5. Tag/Service Suggestion Forms
- **Suggest Tag Form**: Name, category, emoji, reason
- **Suggest Service Form**: Name, description, emoji, reason
- **Status tracking**: See pending suggestions
- **Admin approval notifications**

### 6. Admin Dashboard
- **Pending suggestions queue**
- **Approval workflow**: One-click approve/reject
- **Usage analytics**: Popular tags/services
- **Moderation tools**: Remove inappropriate content
- **Bulk operations**: Approve multiple suggestions

This design gives you a complete marketplace where users can both offer and consume services, with a rich tagging system for profiles and comprehensive booking/review functionality.
