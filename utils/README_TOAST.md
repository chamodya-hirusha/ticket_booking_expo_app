# Toast Notification System

## Overview
This system handles API validation errors gracefully by showing user-friendly toast notifications instead of logging them as app errors.

## Usage

### Basic Usage

```typescript
import { toast } from '../services/toast';
import { handleApiError } from '../utils/apiErrorHandler';

// Show error toast
toast.error('Cannot register user with duplicated email!');

// Show success toast
toast.success('Account created successfully!');

// Show info toast
toast.info('Please check your email for verification');

// Show warning toast
toast.warning('Your session will expire soon');
```

### In API Error Handling

```typescript
import { handleApiError } from '../utils/apiErrorHandler';

const response = await apiService.someMethod();

if (!response.success) {
  // Automatically shows toast for validation errors
  // Returns user-friendly error message
  const errorMessage = handleApiError(response.data || response, response.data?._status, true);
  return { success: false, error: errorMessage };
}
```

### Validation Error Detection

The system automatically detects validation errors by:
- HTTP Status Codes: 400, 409, 422
- Error Codes: "10", "06"
- Response Structure: Checks for validation error patterns

### Error Message Extraction

The system extracts messages in this priority:
1. `error.message` or `error.error`
2. `error.content.message`
3. First value from `error.content` object (for field-specific errors)
4. `error.data.content` (nested structure)
5. Default fallback message

## Example: Registration Error

When API returns:
```json
{
  "code": "10",
  "message": "Validation failed",
  "content": {
    "email": "Cannot register user with duplicated email!"
  }
}
```

The system will:
1. Detect it's a validation error (code "10")
2. Extract message: "Cannot register user with duplicated email!"
3. Show toast notification (not log as error)
4. Return the message for UI display

## Production Behavior

- ✅ Validation errors: Shown as toast, logged as info in dev mode only
- ✅ System errors: Shown as generic toast, logged as error in dev mode
- ✅ No console errors for validation errors in production
- ✅ User-friendly messages extracted from API responses

