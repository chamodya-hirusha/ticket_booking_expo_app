// ========== SHARED TYPES ==========

export interface ApiResponse<T> {
  success: boolean;
  data?: T | (Record<string, unknown> & { _status?: number; code?: string });
  message?: string;
  error?: string;
}

// ========== AUTH TYPES ==========

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  token: string;
}

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface SignUpResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
  };
  token: string;
}

export interface LoginResponseDTO {
  token: string;
  userId: string;
  username: string;
  role: string;
}

export interface UserRegisterRequestDTO {
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
}

export interface VendorRegisterRequestDTO {
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  website: string;
}

// ========== EVENT TYPES ==========

export interface Event {
  id: string;
  name: string;
  eventName?: string; // Alternative field name
  slug: string;
  description: string;
  location: string;
  eventLocation?: string; // Alternative field name
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
  imageUrl?: string;
  image_url?: string;
}

export interface EventCreateRequest {
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
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface EventSearchParams {
  text?: string;
  category?: string;
  location?: string;
  start?: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
}

export interface EventCancelRequest {
  eventId: number;
  reason: string;
}

export interface EventPostponeRequest {
  eventId: number;
  reason: string;
}

export interface EventQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'ASC' | 'DESC';
}

// ========== PAYMENT TYPES ==========

export interface StripePaymentRequest {
  reservationId: number;
  amount: number;
  currency: string;
}

export interface StripePaymentResponse {
  id: string;
  intentId?: string;
  status: string;
  paymentStatus?: string; // Alternative field name
  amount: number;
  currency: string;
  reservationId: number;
  clientSecret?: string;
  reservation?: {
    id: number | string;
  };
}

export interface StripePayment extends StripePaymentResponse {}

export interface StripeRefundRequest {
  reservationId: number;
  reason: string;
}

// ========== USER TYPES ==========

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  username?: string;
  role?: string;
  isVerified?: boolean;
  verified?: boolean;
}

// ========== RESERVATION TYPES ==========

export interface ReservationRequestDTO {
  eventId: number;
  ticketType: string;
  ticketCount: number;
  // Note: ticketPrice is NOT sent to API - backend calculates it from event
}

export interface QrCheckInRequestDTO {
  qrToken: string;
}

export interface TicketTypeStats {
  sold: number;
  scanned: number;
  total: number;
}

export interface TicketStatsResponse {
  vip: TicketTypeStats;
  premium: TicketTypeStats;
  general: TicketTypeStats;
  latestScans: any[]; // Assuming array of scan records, type not specified
}

export interface Reservation {
  id: number;
  eventId: number;
  userId: number;
  ticketType: string;
  ticketCount: number;
  ticketPrice: number;
  totalAmount: number;
  status: ReservationStatus;
  reservationStatus?: string; // Alternative field name
  reservationDate?: string;
  isCheckedIn?: boolean;
  eventDetails?: Event;
  paymentStatus?: string;
  payment?: {
    status?: string;
    paymentStatus?: string;
  };
  qrToken?: string;
  qrCode?: string;
  qr_token?: string;
  seat?: string;
  seatNumber?: string;
  seat_number?: string;
  seatInfo?: string;
  seat_info?: string;
  section?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED' | 'COMPLETED';

export interface ReservationStatusParams {
  page?: number;
  size?: number;
  sort?: string; // e.g., "id,asc" or "id,desc"
}

// ========== CATEGORY TYPES ==========

export interface Category {
  id: number;
  name: string;
  description: string;
  iconName?: string;
  iconUrl?: string;
}

export interface CategoryCreateRequest {
  name: string;
  description: string;
}

export interface CategoryUpdateRequest {
  name: string;
  description: string;
}
