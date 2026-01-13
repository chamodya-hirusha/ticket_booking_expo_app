import { toast } from '../services/toast';

export interface ApiErrorResponse {
  code?: string;
  content?: any;
  message?: string;
  error?: string;
  status?: number;
}

const VALIDATION_ERROR_CODES = ['10', '06', '409', '05'];
const VALIDATION_HTTP_STATUSES = [400, 409, 422];

export function isValidationError(error: ApiErrorResponse | any, status?: number): boolean {
  // Check HTTP status codes
  if (status !== undefined) {
    if (VALIDATION_HTTP_STATUSES.includes(status)) {
      return true;
    }
    // Treat 401 with code "02" as validation error (invalid credentials - normal business logic)
    if (status === 401 && error?.code === '02') {
      return true;
    }
  }

  // Check error code
  if (error?.code && VALIDATION_ERROR_CODES.includes(String(error.code))) {
    return true;
  }
  // Treat 401 with code "02" as validation error
  if (error?.code === '02' && (status === 401 || error?.status === 401 || error?._status === 401)) {
    return true;
  }

  // Check if status is in the error object
  if (error?.status && VALIDATION_HTTP_STATUSES.includes(error.status)) {
    return true;
  }
  // Check for 401 with code "02" in error object
  if (error?.status === 401 && error?.code === '02') {
    return true;
  }

  // Check if _status is in data (from base.ts)
  if (error?._status && VALIDATION_HTTP_STATUSES.includes(error._status)) {
    return true;
  }
  // Check for 401 with code "02" in _status
  if (error?._status === 401 && error?.code === '02') {
    return true;
  }

  return false;
}


export function extractErrorMessage(error: ApiErrorResponse | any, defaultMessage: string = 'An error occurred'): string {
  // Priority 1: Direct message field
  if (error?.message && typeof error.message === 'string') {
    return error.message;
  }

  // Priority 2: Error field
  if (error?.error && typeof error.error === 'string') {
    return error.error;
  }

  // Priority 3: Extract from nested content object (validation errors)
  if (error?.content && typeof error.content === 'object') {
    // Check if content has a message
    if (error.content.message && typeof error.content.message === 'string') {
      return error.content.message;
    }


    const contentErrors = Object.values(error.content);
    if (contentErrors.length > 0) {
      const firstError = contentErrors[0];
      if (typeof firstError === 'string') {
        return firstError;
      }
    }
  }

  // Priority 4: Extract from data.content (nested structure)
  if (error?.data?.content) {
    if (typeof error.data.content === 'string') {
      return error.data.content;
    }
    if (typeof error.data.content === 'object') {
      const contentErrors = Object.values(error.data.content);
      if (contentErrors.length > 0 && typeof contentErrors[0] === 'string') {
        return contentErrors[0] as string;
      }
    }
  }

  // Priority 5: Check data.message
  if (error?.data?.message && typeof error.data.message === 'string') {
    return error.data.message;
  }

  return defaultMessage;
}

export function handleApiError(
  error: ApiErrorResponse | any,
  status?: number,
  showToast: boolean = true
): string {
  const isValidation = isValidationError(error, status);
  const errorMessage = extractErrorMessage(error, 'An unexpected error occurred');

  if (isValidation) {
    // Validation errors: Show user-friendly toast, don't log as error
    if (showToast) {
      toast.error(errorMessage, 'Validation Error');
    }
  } else {
    const errorStatus = status || error?.status || error?._status;
    const errorCode = error?.code;
    const shouldIgnore = errorStatus === 401 && errorCode === '02';

    if (!shouldIgnore) {
      if (showToast) {
        toast.error('An unexpected error occurred. Please try again later.', 'Error');
      }
    }
  }

  return errorMessage;
}

