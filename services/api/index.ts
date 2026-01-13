// ========== MAIN API SERVICE ==========
// Combines all API services into a single unified service

import { AuthApiService } from './auth';
import { UserApiService } from './user';
import { EventApiService } from './event';
import { PaymentApiService } from './payment';
import { ReservationApiService } from './reservation';
import { ScanApiService } from './scan';

// Export all types
export * from './types';
export * from './scan';

// Unified API Service class that combines all services
class ApiService extends AuthApiService {
  // User API methods
  public user: UserApiService;
  
  // Event API methods
  public event: EventApiService;
  
  // Payment API methods
  public payment: PaymentApiService;
  
  // Reservation API methods
  public reservation: ReservationApiService;

  // Scan API methods
  public scan: ScanApiService;

  // Auth API methods (accessible directly)
  public auth: AuthApiService;

  constructor() {
    super();
    this.user = new UserApiService();
    this.event = new EventApiService();
    this.payment = new PaymentApiService();
    this.reservation = new ReservationApiService();
    this.scan = new ScanApiService();
    this.auth = this; // Auth methods are inherited, but we can also access via this.auth
  }
  async getUser(userId?: string | number) {

    if (!userId) {
      return this.user.getCurrentUser();
    }
    return this.user.getUser(userId);
  }

  async getUserRaw(userId: string | number) {
    return this.user.getUserRaw(userId);
  }

  async validateUserId(userId: string | number) {
    return this.user.validateUserId(userId);
  }

  async userHealthCheck() {
    return this.user.userHealthCheck();
  }

  async getProfile() {
    return this.user.getProfile();
  }

  async updateProfile(name: string, avatar?: string) {
    return this.user.updateProfile(name, avatar);
  }

  async getEventById(id: string | number) {
    return this.event.getEventById(id);
  }

  async getAllEvents(params?: any) {
    return this.event.getAllEvents(params);
  }

  async getScheduledEvents(params?: any) {
    return this.event.getScheduledEvents(params);
  }

  async searchEvents(params?: any) {
    return this.event.searchEvents(params);
  }

  async advancedSearchEvents(params?: any) {
    return this.event.advancedSearchEvents(params);
  }

  async updateEvent(id: string | number, eventData: any) {
    return this.event.updateEvent(id, eventData);
  }

  async publishEvent(id: string | number) {
    return this.event.publishEvent(id);
  }

  async cancelEvent(id: string | number) {
    return this.event.cancelEvent(id);
  }

  async eventHealthCheck() {
    return this.event.eventHealthCheck();
  }

  // Public Event methods (no authentication required)
  async getPublicEvent(id?: string | number, slug?: string) {
    return this.event.getPublicEvent(id, slug);
  }

  async getAllPublicEvents(params?: any) {
    return this.event.getAllPublicEvents(params);
  }

  async getScheduledPublicEvents(params?: any) {
    return this.event.getScheduledPublicEvents(params);
  }

  async searchPublicEvents(params?: any) {
    return this.event.searchPublicEvents(params);
  }

  async advancedSearchPublicEvents(params?: any) {
    return this.event.advancedSearchPublicEvents(params);
  }

  async publicEventHealthCheck() {
    return this.event.publicEventHealthCheck();
  }

  // Contact/Support methods
  async sendContactMessage(name: string, email: string, subject: string, message: string) {
    return super.sendContactMessage(name, email, subject, message);
  }

  // Payment methods
  async createStripePayment(
    reservationId: number,
    amount: number,
    currency: string = 'USD',
    userId: string | number
  ) {
    return this.payment.createStripePayment(reservationId, amount, currency, userId);
  }

  async refundStripePayment(reservationId: number, reason: string) {
    return this.payment.refundStripePayment(reservationId, reason);
  }

  // Reservation methods
  async createReservation(
    eventId: number,
    ticketType: string,
    ticketCount: number,
    ticketPrice: number,
    userId: string | number,
    userRole: string
  ) {
    return this.reservation.createReservation(eventId, ticketType, ticketCount, ticketPrice, userId, userRole);
  }

  async getReservationById(reservationId: number) {
    return this.reservation.getReservationById(reservationId);
  }

  async getUserReservations(params?: any) {
    return this.reservation.getUserReservations(params);
  }

  async getReservationsByStatus(status: any, params?: any) {
    return this.reservation.getReservationsByStatus(status, params);
  }

  async cancelReservation(
    eventId: number,
    ticketType: string,
    ticketCount: number,
    ticketPrice: number,
    userId: string | number,
    userRole: string
  ) {
    return this.reservation.cancelReservation(eventId, ticketType, ticketCount, ticketPrice, userId, userRole);
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export individual services for direct access if needed
export const authApi = new AuthApiService();
export const userApi = new UserApiService();
export const eventApi = new EventApiService();
export const paymentApi = new PaymentApiService();
export const reservationApi = new ReservationApiService();
export const scanApi = new ScanApiService();

