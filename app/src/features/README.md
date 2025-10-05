# Feature-Based Architecture

This directory contains all application features organized in a modular, scalable structure. Each feature is self-contained with its own types, API calls, hooks, and components.

## 📁 Directory Structure

```
src/features/
├── notifications/          # 🔔 Notifications feature
│   ├── api/               # API calls
│   │   └── notifications.ts
│   ├── components/        # UI components
│   │   ├── NotificationCard.tsx
│   │   ├── NotificationList.tsx
│   │   └── index.ts
│   ├── hooks/             # React Query hooks
│   │   ├── queries.ts     # Data fetching (useQuery)
│   │   ├── mutations.ts   # Data modifications (useMutation)
│   │   └── index.ts
│   ├── schemas.ts         # Zod validation schemas
│   ├── types.ts           # TypeScript types
│   └── index.ts           # Feature exports
├── groups/                # 🔗 Groups feature
│   ├── api/
│   ├── components/
│   ├── hooks/
│   ├── types.ts
│   └── index.ts
├── events/                # 📅 Events feature (TODO)
├── messages/              # 💬 Messages feature (TODO)
├── userServices/          # 👥 User Services feature (TODO)
└── index.ts              # All features export
```

## 🎯 Benefits

### **1. Modularity**
- Each feature is self-contained
- Easy to add/remove features
- Clear separation of concerns

### **2. Scalability**
- New features don't affect existing ones
- Easy to onboard new developers
- Consistent patterns across features

### **3. Maintainability**
- Related code is co-located
- Easy to find and update
- Reduced coupling between features

### **4. Reusability**
- Components can be shared across features
- Hooks can be composed
- API utilities are consistent

## 🛠️ Implementation Patterns

### **API Layer**
```typescript
// features/notifications/api/notifications.ts
import { axiosInstance } from '@/lib/http/axios';

export const notificationsApi = {
  getUserNotifications: (userId: number, filters?: NotificationFilters) => {
    return axiosInstance.get<NotificationResponse>(`/users/${userId}/notifications`, { params: filters });
  },
  // ... other API methods
};
```

### **React Query Hooks**
```typescript
// features/notifications/hooks/queries.ts
export const useNotifications = (userId: number, filters?: NotificationFilters) => {
  return useQuery({
    queryKey: ['notifications', userId, filters],
    queryFn: () => notificationsApi.getUserNotifications(userId, filters),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
};
```

### **Mutations with Optimistic Updates**
```typescript
// features/notifications/hooks/mutations.ts
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, notificationId }) =>
      notificationsApi.markAsRead(userId, notificationId),
    onSuccess: (response, variables) => {
      // Optimistic update
      queryClient.setQueryData(
        ['notification', variables.userId, variables.notificationId],
        (old) => ({ ...old, status: 'READ' })
      );
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
    },
  });
};
```

### **Type-Safe Components**
```typescript
// features/notifications/components/NotificationCard.tsx
interface NotificationCardProps {
  notification: Notification;
  userId: number;
}

export function NotificationCard({ notification, userId }: NotificationCardProps) {
  const markAsReadMutation = useMarkAsRead();
  // ... component logic
}
```

## 🔄 HTTP Client Integration

### **Direct Axios Usage**
All features use `axiosInstance` directly from `@/lib/http/axios` instead of wrapper functions. This provides:
- Direct access to axios features
- Consistent error handling via interceptors
- Better TypeScript support
- Simplified debugging

### **Axios with Interceptors**
```typescript
// lib/http/axios.ts
import axios from 'axios';
import { createAuthTokenInterceptor, createErrorInterceptor } from './helpers';

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor for auth tokens
axiosInstance.interceptors.request.use(createAuthTokenInterceptor);

// Response interceptor for error handling
axiosInstance.interceptors.response.use((response) => response, createErrorInterceptor);
```

### **Error Handling**
```typescript
// lib/http/helpers.ts
export const createErrorInterceptor = (error: AxiosError) => {
  const { response } = error;

  if (response) {
    switch (response.status) {
      case 401:
        toast.error('Unauthorized. Please sign in again.');
        window.location.href = '/sign-in';
        break;
      case 403:
        toast.error('Access denied.');
        break;
      // ... other error cases
    }
  }

  return Promise.reject(error);
};
```

## 📋 Adding New Features

### **1. Create Feature Directory**
```bash
mkdir src/features/newFeature
mkdir src/features/newFeature/{api,components,hooks}
```

### **2. Define Types**
```typescript
// features/newFeature/types.ts
export interface NewFeatureItem {
  id: number;
  name: string;
  // ... other properties
}
```

### **3. Create API Layer**
```typescript
// features/newFeature/api/newFeature.ts
import { axiosInstance } from '@/lib/http/axios';

export const newFeatureApi = {
  getItems: () => axiosInstance.get<NewFeatureItem[]>('/new-feature'),
  createItem: (data: CreateItemRequest) => axiosInstance.post('/new-feature', data),
  // ... other methods
};
```

### **4. Create React Query Hooks**
```typescript
// features/newFeature/hooks/queries.ts
export const useNewFeatureItems = () => {
  return useQuery({
    queryKey: ['newFeatureItems'],
    queryFn: newFeatureApi.getItems,
  });
};
```

### **5. Create Components**
```typescript
// features/newFeature/components/NewFeatureList.tsx
export function NewFeatureList() {
  const { data, isLoading } = useNewFeatureItems();
  // ... component logic
}
```

### **6. Export Everything**
```typescript
// features/newFeature/index.ts
export * from './types';
export * from './api/newFeature';
export * from './hooks';
export * from './components';
```

## 🚀 Best Practices

### **1. Consistent Naming**
- Use descriptive, consistent names
- Follow the pattern: `useFeatureAction`
- API methods should be clear and concise

### **2. Error Boundaries**
- Wrap feature components in error boundaries
- Handle loading and error states gracefully
- Provide meaningful error messages

### **3. Performance**
- Use React.memo for expensive components
- Implement proper loading states
- Optimize React Query cache strategies

### **4. Testing**
- Write unit tests for hooks
- Test API integration
- Mock external dependencies

### **5. Documentation**
- Document complex business logic
- Add JSDoc comments for public APIs
- Keep README files updated

## 🔧 Development Workflow

1. **Start with Types**: Define your data structures first
2. **Create API Layer**: Implement your API calls
3. **Add React Query Hooks**: Create data fetching hooks
4. **Build Components**: Create UI components
5. **Test Integration**: Ensure everything works together
6. **Export Everything**: Make your feature available

## 📚 Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Axios Documentation](https://axios-http.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
