// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://tickbookapi.braintisa.com/api',
  TIMEOUT: 30000, // 30 seconds
};

// Stripe Configuration
export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SgoIoCYPLJFJWY5PySNQWkVXnw8kuYHoZ6EVD7807dcql4hzzftXN6jDHfE978f6RAGRCqwgxtOOK2Vz3t5gIcw003oHJu1gn',
};



export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  vipTicketLimit: number;
  premiumTicketLimit: number;
  generalTicketLimit: number;
  vipTicketPrice: number;
  premiumTicketPrice: number;
  generalTicketPrice: number;
  eventCategory: string;
  eventStatus: string;
  image?: string;
  imageUrl?: string; // Backend returns imageUrl (camelCase)
  image_url?: string; // Backend might return image_url (snake_case) depending on Jackson config
}

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  status: 'Active' | 'Used' | 'Expired';
  tier: string;
  date: string;
  location: string;
  image: string;
  qrCode?: string;
  seat?: string;
}

export const EVENTS: Event[] = [];

export const TICKETS: Ticket[] = [];


const DEFAULT_EVENT_IMAGE_URL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI0NDQ0NDQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FdmVudCBJbWFnZTwvdGV4dD48L3N2Zz4=';


export const getEventImageUrl = (imageUrl?: string | null): string => {

  if (imageUrl === null || imageUrl === undefined || (typeof imageUrl === 'string' && imageUrl.trim() === '')) {
    return DEFAULT_EVENT_IMAGE_URL;
  }

  // At this point, imageUrl should be a non-empty string
  const trimmedUrl = String(imageUrl).trim();

  // If it's already a full URL (http:// or https://), return as is
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // If it's a relative path starting with /, combine with API base URL
  if (trimmedUrl.startsWith('/')) {
    // Remove /api from BASE_URL if present, then add the image path
    const baseUrl = API_CONFIG.BASE_URL.replace(/\/api$/, '');
    const fullUrl = `${baseUrl}${trimmedUrl}`;
    return fullUrl;
  }

  // If it's a relative path without leading slash, try to construct full URL
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/api$/, '');

  // Try different common image path patterns
  if (trimmedUrl.includes('/') || trimmedUrl.includes('\\')) {
    // Has path separators, assume it's a relative path
    const fullUrl = `${baseUrl}/${trimmedUrl.startsWith('/') ? trimmedUrl.slice(1) : trimmedUrl}`;
    return fullUrl;
  }

  // If it's just a filename, try common image directories
  // Try /api/images/ first, then /images/, then root
  const possiblePaths = [
    `${baseUrl}/api/images/${trimmedUrl}`,
    `${baseUrl}/images/${trimmedUrl}`,
    `${baseUrl}/${trimmedUrl}`,
  ];

  // Return the first common path (will fallback to default if none work)
  return possiblePaths[0];
};
