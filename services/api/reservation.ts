import { BaseApiService } from './base';
import { ApiResponse, Reservation, ReservationRequestDTO, ReservationStatus, PaginatedResponse, QrCheckInRequestDTO, TicketStatsResponse } from './types';

export class ReservationApiService extends BaseApiService {
  // ========== RESERVATION API METHODS (Reservation Service) ==========

  async createReservation(
    eventId: number,
    ticketType: string,
    ticketCount: number
  ): Promise<ApiResponse<Reservation>> {
    const requestBody: ReservationRequestDTO = {
      eventId,
      ticketType,
      ticketCount,
    };

    return this.request<Reservation>('/v1/reservation', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async checkIn(qrToken: string): Promise<ApiResponse<string>> {
    const requestBody: QrCheckInRequestDTO = {
      qrToken,
    };

    return this.request<string>('/v1/reservation/check-in', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async getUserReservations(params?: { page?: number; size?: number; sortBy?: string; direction?: 'ASC' | 'DESC' }): Promise<ApiResponse<PaginatedResponse<Reservation>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Reservation>>(`/v1/reservation/user-reservations${queryString}`, {
      method: 'GET',
    });
  }

  async getRefundAvailableReservations(params?: { page?: number; size?: number; sortBy?: string; direction?: 'ASC' | 'DESC' }): Promise<ApiResponse<PaginatedResponse<Reservation>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Reservation>>(`/v1/reservation/refund-available${queryString}`, {
      method: 'GET',
    });
  }

  async cancelReservation(
    eventId: number,
    ticketType: string,
    ticketCount: number
  ): Promise<ApiResponse<string>> {
    const requestBody: ReservationRequestDTO = {
      eventId,
      ticketType,
      ticketCount,
    };

    return this.request<string>('/v1/reservation/event-cancel', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async getTicketStatistics(eventId: number): Promise<ApiResponse<TicketStatsResponse>> {
    return this.request<TicketStatsResponse>(`/v1/reservation/stats/${eventId}`, {
      method: 'GET',
    });
  }

  async getAllReservations(params?: { page?: number; size?: number; sortBy?: string; direction?: 'ASC' | 'DESC' }): Promise<ApiResponse<PaginatedResponse<Reservation>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Reservation>>(`/v1/reservation/all${queryString}`, {
      method: 'GET',
    });
  }

  async getTicketTypes(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/v1/reservation/ticket-types', {
      method: 'GET',
    });
  }

  async getReservationById(reservationId: number | string): Promise<ApiResponse<Reservation>> {
    return this.request<Reservation>(`/v1/reservation/${reservationId}`, {
      method: 'GET',
    });
  }
}

