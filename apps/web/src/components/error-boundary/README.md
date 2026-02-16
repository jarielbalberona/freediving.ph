# Error Boundary System

A comprehensive error handling system for the freediving.ph application that provides graceful error recovery, user-friendly error messages, and detailed error reporting.

## 🎯 Overview

The error boundary system consists of multiple layers of error handling:

1. **AppErrorBoundary** - Top-level error boundary for the entire application
2. **NetworkErrorBoundary** - Handles network connectivity issues
3. **FeatureErrorBoundary** - Feature-specific error boundaries
4. **ErrorBoundary** - Generic error boundary component
5. **Error Reporting Service** - Centralized error reporting and monitoring

## 📁 Components

### **ErrorBoundary**
The base error boundary component that catches JavaScript errors anywhere in the child component tree.

```typescript
<ErrorBoundary
  level="page"
  onError={(error, errorInfo) => {
    console.error('Error caught:', error);
  }}
  resetKeys={[userId]}
  resetOnPropsChange={true}
>
  <YourComponent />
</ErrorBoundary>
```

**Props:**
- `level`: 'page' | 'feature' | 'component' - Error severity level
- `onError`: Custom error handler function
- `resetKeys`: Array of values to reset the boundary when they change
- `resetOnPropsChange`: Whether to reset when props change
- `fallback`: Custom fallback component

### **NetworkErrorBoundary**
Handles network connectivity issues and offline scenarios.

```typescript
<NetworkErrorBoundary>
  <YourComponent />
</NetworkErrorBoundary>
```

**Features:**
- Detects online/offline status
- Catches network-related fetch errors
- Provides network-specific error messages
- Auto-recovery when connection is restored

### **FeatureErrorBoundary**
Feature-specific error boundary with enhanced error reporting.

```typescript
<FeatureErrorBoundary featureName="notifications">
  <NotificationList />
</FeatureErrorBoundary>
```

**Features:**
- Feature-specific error reporting
- Custom error messages per feature
- Enhanced debugging information
- HOC wrapper available

### **AppErrorBoundary**
Top-level error boundary that wraps the entire application.

```typescript
<AppErrorBoundary>
  <YourApp />
</AppErrorBoundary>
```

**Features:**
- Catches all unhandled errors
- Network error handling
- Comprehensive error reporting
- User-friendly error recovery

## 🛠️ Usage Examples

### **Page-Level Error Boundary**
```typescript
// app/notifications/page.tsx
import { FeatureErrorBoundary } from '@/components/error-boundary';

export default function NotificationsPage() {
  return (
    <FeatureErrorBoundary featureName="notifications">
      <div>
        <NotificationList />
      </div>
    </FeatureErrorBoundary>
  );
}
```

### **Component-Level Error Boundary**
```typescript
// components/NotificationCard.tsx
import { ErrorBoundary } from '@/components/error-boundary';

export function NotificationCard({ notification }) {
  return (
    <ErrorBoundary level="component">
      <div className="notification-card">
        {/* Component content */}
      </div>
    </ErrorBoundary>
  );
}
```

### **HOC for Error Boundaries**
```typescript
// features/notifications/components/NotificationList.tsx
import { withFeatureErrorBoundary } from '@/components/error-boundary';

function NotificationList({ userId }) {
  // Component logic
}

export default withFeatureErrorBoundary(
  NotificationList,
  'notifications',
  (error, errorInfo) => {
    console.error('Notification list error:', error);
  }
);
```

### **Custom Error Fallback**
```typescript
<ErrorBoundary
  fallback={
    <div className="custom-error">
      <h2>Something went wrong</h2>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

## 📊 Error Reporting

### **Error Reporting Service**
The error reporting service automatically captures and reports errors:

```typescript
import { reportError, reportFeatureError } from '@/lib/error-reporting';

// Report a general error
reportError(error, {
  level: 'component',
  feature: 'notifications',
  metadata: { userId: 123 }
});

// Report a feature-specific error
reportFeatureError(error, 'notifications', {
  metadata: { action: 'markAsRead' }
});
```

### **Error Report Structure**
```typescript
interface ErrorReport {
  errorId: string;           // Unique error identifier
  message: string;            // Error message
  stack?: string;            // Error stack trace
  componentStack?: string;   // React component stack
  timestamp: string;         // When the error occurred
  userAgent: string;         // Browser information
  url: string;              // Current page URL
  userId?: string;          // User ID (if available)
  level: 'page' | 'feature' | 'component';
  feature?: string;         // Feature name
  metadata?: Record<string, any>; // Additional context
}
```

## 🎨 Error UI Components

### **ErrorFallback**
The default error fallback component that displays user-friendly error messages.

```typescript
<ErrorFallback
  error={error}
  resetError={resetError}
  level="page"
  isNetworkError={false}
  errorId="error_123"
/>
```

**Features:**
- Different error messages based on level
- Network error detection
- Development error details
- Recovery actions (retry, reload, go home)
- Error ID for support

### **Custom Error Messages**
Error messages are contextual based on the error level:

- **Page Level**: "Something went wrong with this page"
- **Feature Level**: "This feature is temporarily unavailable"
- **Component Level**: "This component encountered an error"
- **Network Level**: "Connection problem - Please check your internet connection"

## 🔧 Configuration

### **Environment Variables**
```bash
# Error reporting endpoint
NEXT_PUBLIC_ERROR_REPORTING_URL=/api/errors

# Error reporting enabled
NEXT_PUBLIC_ERROR_REPORTING_ENABLED=true
```

### **Error Reporting Setup**
```typescript
// lib/error-reporting.ts
import { errorReporter } from '@/lib/error-reporting';

// Set user context
errorReporter.setUser(userId);

// Clear user context
errorReporter.clearUser();
```

## 🚀 Best Practices

### **1. Error Boundary Placement**
- Place error boundaries at strategic points in your component tree
- Use feature-level boundaries for major features
- Use component-level boundaries for critical components
- Always have a top-level boundary

### **2. Error Recovery**
- Provide clear recovery actions
- Implement retry mechanisms
- Handle network errors gracefully
- Provide fallback content when possible

### **3. Error Reporting**
- Include relevant context in error reports
- Don't include sensitive user data
- Use meaningful error IDs
- Monitor error rates and patterns

### **4. User Experience**
- Show user-friendly error messages
- Provide clear next steps
- Don't expose technical details to users
- Maintain application state when possible

## 🧪 Testing Error Boundaries

### **Testing Error Scenarios**
```typescript
// __tests__/ErrorBoundary.test.tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error-boundary';

function ThrowError() {
  throw new Error('Test error');
}

test('ErrorBoundary catches errors', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

### **Testing Network Errors**
```typescript
// Mock network errors
global.fetch = jest.fn(() =>
  Promise.reject(new Error('Network error'))
);

// Test network error boundary
test('NetworkErrorBoundary handles network errors', () => {
  // Test implementation
});
```

## 📈 Monitoring and Analytics

### **Error Metrics**
- Error frequency by feature
- Error types and patterns
- User impact assessment
- Recovery success rates

### **Error Dashboard**
- Real-time error monitoring
- Error trend analysis
- User experience impact
- Performance correlation

## 🔍 Debugging

### **Development Mode**
In development, error boundaries show:
- Full error stack traces
- Component stack information
- Error boundary context
- Recovery actions

### **Production Mode**
In production, error boundaries:
- Hide technical details
- Show user-friendly messages
- Report errors to monitoring service
- Provide error IDs for support

## 📚 Resources

- [React Error Boundaries](https://reactjs.org/docs/error-boundaries.html)
- [Error Handling Best Practices](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react)
- [Error Monitoring Services](https://sentry.io/for/react/)
- [Network Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
