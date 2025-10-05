# Database Relationships: Users → User Services → Service Tags

## Entity Relationship Diagram

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│    USERS    │    │  USER_SERVICES  │    │    TAGS    │
│             │    │                 │    │            │
│ id (PK)     │◄───┤ user_id (FK)   │    │ id (PK)    │
│ clerk_id    │    │ service_type    │    │ name       │
│ name        │    │ title           │    │ category   │
│ email       │    │ description     │    │ emoji      │
│ image       │    │ rate            │    │            │
│ role        │    │ is_available    │    │            │
└─────────────┘    └─────────────────┘    └─────────────┘
       │                    │                      ▲
       │                    │                      │
       │                    │              ┌───────────────┐
       │                    └──────────────┤ SERVICE_TAGS │
       │                                   │              │
       │                                   │ service_id   │
       │                                   │ tag_id       │
       │                                   │ is_primary   │
       │                                   │ is_required  │
       │                                   └───────────────┘
       │
       │              ┌─────────────┐
       └──────────────┤  USER_TAGS  │
                      │             │
                      │ user_id     │
                      │ tag_id      │
                      │ is_top_tag  │
                      └─────────────┘
```

## Relationship Types

### 1. USER → USER_SERVICES (One-to-Many)
- **One user** can offer **multiple services**
- **One service** belongs to **one user**
- Foreign Key: `user_services.user_id → users.id`

### Example:
```
User: "John Doe" (id: 123)
├── Service 1: "Professional Dive Buddy" (BUDDY)
├── Service 2: "Underwater Photographer" (PHOTOGRAPHER)
└── Service 3: "Dive Instructor" (INSTRUCTOR)
```

### 2. USER_SERVICES → SERVICE_TAGS (Many-to-Many)
- **One service** can have **multiple tags**
- **One tag** can be used by **multiple services**
- Junction Table: `service_tags`

### Example:
```
Service: "Underwater Photographer" (id: 456)
├── Tag: "Reef Photography" (is_primary: true)
├── Tag: "Macro Photography" (is_primary: false)
├── Tag: "Anilao" (location)
└── Tag: "PADI Advanced" (certification)
```

### 3. USER → USER_TAGS (Many-to-Many)
- **One user** can have **multiple tags**
- **One tag** can be used by **multiple users**
- Junction Table: `user_tags`

### Example:
```
User: "John Doe" (id: 123)
├── Tag: "Deep Diving" (is_top_tag: true)
├── Tag: "Safety Diver" (is_top_tag: false)
└── Tag: "Anilao" (location)
```

## Data Flow Examples

### Scenario 1: Find Buddy Services with Deep Diving Skills
```sql
SELECT u.name, us.title, us.rate, t.name as skill
FROM users u
JOIN user_services us ON u.id = us.user_id
JOIN service_tags st ON us.id = st.service_id
JOIN tags t ON st.tag_id = t.id
WHERE us.service_type = 'BUDDY'
AND t.name = 'Deep Diving'
AND us.is_available = true;
```

### Scenario 2: Find Photographers in Anilao
```sql
SELECT u.name, us.title, us.rate, t.name as location
FROM users u
JOIN user_services us ON u.id = us.user_id
JOIN service_tags st ON us.id = st.service_id
JOIN tags t ON st.tag_id = t.id
WHERE us.service_type = 'PHOTOGRAPHER'
AND t.name = 'Anilao'
AND us.is_available = true;
```

### Scenario 3: User Profile with All Tags
```sql
-- User's personal tags
SELECT 'personal' as type, t.name, t.emoji, ut.is_top_tag
FROM users u
JOIN user_tags ut ON u.id = ut.user_id
JOIN tags t ON ut.tag_id = t.id
WHERE u.id = 123

UNION ALL

-- User's service tags
SELECT 'service' as type, t.name, t.emoji, st.is_primary
FROM users u
JOIN user_services us ON u.id = us.user_id
JOIN service_tags st ON us.id = st.service_id
JOIN tags t ON st.tag_id = t.id
WHERE u.id = 123;
```

## Key Benefits

1. **Flexible Tagging**: Same tag system for users and services
2. **Rich Relationships**: Users can have personal tags AND service tags
3. **Searchable**: Find services by skills, location, certifications
4. **Scalable**: Add new tags without schema changes
5. **Consistent**: Unified tagging across the platform
