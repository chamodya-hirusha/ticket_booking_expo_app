import { BaseApiService } from './base';
import { ApiResponse, Reservation, ReservationRequestDTO, ReservationStatus, ReservationStatusParams, PaginatedResponse } from './types';

export class ReservationApiService extends BaseApiService {
  // ========== RESERVATION API METHODS (Reservation Service) ==========

  async createReservation(
    eventId: number,
    ticketType: string,
    ticketCount: number,
    ticketPrice: number, 
    userId: string | number,
    userRole: string
  ): Promise<ApiResponse<Reservation>> {
    const requestBody = {
      eventId,
      ticketType,
      ticketCount,
    };

    return this.request<Reservation>('/v1/reservation', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async getReservationById(reservationId: number): Promise<ApiResponse<Reservation>> {
    return this.request<Reservation>(`/v1/reservation/${reservationId}`, {
      method: 'GET',
    });
  }

  async getUserReservations(params?: ReservationStatusParams & { sortBy?: string; direction?: 'ASC' | 'DESC' }): Promise<ApiResponse<PaginatedResponse<Reservation>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Reservation>>(`/v1/reservation/user-reservations${queryString}`, {
      method: 'GET',
    });
  }

  async getReservationsByStatus(status: ReservationStatus, params?: ReservationStatusParams): Promise<ApiResponse<PaginatedResponse<Reservation>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Reservation>>(`/v1/reservation/status/${status}${queryString}`, {
      method: 'GET',
    });
  }

  async cancelReservation(
    eventId: number,
    ticketType: string,
    ticketCount: number,
    ticketPrice: number, 
    userId: string | number,
    userRole: string
  ): Promise<ApiResponse<any>> {
    const requestBody = {
      eventId,
      ticketType,
      ticketCount,
    };

    return this.request<any>('/v1/reservation/cancel', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async reservationHealthCheck(): Promise<ApiResponse<string>> {
    try {
      const token = await this.getToken();
      
      const headers: HeadersInit = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${this.baseURL}/v1/reservation/health`, {
        method: 'GET',
        headers,
      });

      const text = await response.text();

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: true,
        data: text,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.',
      };
    }
  }
}

