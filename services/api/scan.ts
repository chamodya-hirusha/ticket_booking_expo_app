import { BaseApiService } from './base';
import { ApiResponse } from './types';

// ========== SCAN TYPES ==========
export interface ScanTicketRequest {
  qrToken: string;
}

export interface ScanTicketResponse {
  success: boolean;
  message: string;
  reservation?: {
    id: number;
    eventId: number;
    userId: number;
    ticketType: string;
    ticketCount: number;
    status: string;
    isCheckedIn: boolean;
    checkedInAt?: string;
    eventDetails?: any;
  };
}

export interface VerifyQRCodeRequest {
  qrCode: string;
  reservationId?: number;
}

export interface VerifyQRCodeResponse {
  valid: boolean;
  message: string;
  reservationDetails?: any;
}

export class ScanApiService extends BaseApiService {
  // ========== SCAN/CHECK-IN API METHODS ==========

  async checkInTicket(qrToken: string): Promise<ApiResponse<ScanTicketResponse>> {
    const requestBody: ScanTicketRequest = {
      qrToken,
    };

    return this.request<ScanTicketResponse>('/v1/scan/check-in', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async verifyQRCode(qrCode: string, reservationId?: number): Promise<ApiResponse<VerifyQRCodeResponse>> {
    const requestBody: VerifyQRCodeRequest = {
      qrCode,
      ...(reservationId && { reservationId }),
    };

    return this.request<VerifyQRCodeResponse>('/v1/scan/verify', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async getCheckInHistory(eventId?: number, page: number = 0, size: number = 20): Promise<ApiResponse<any>> {
    const params: Record<string, any> = {
      page,
      size,
    };
    
    if (eventId) {
      params.eventId = eventId;
    }

    const queryString = this.buildQueryString(params);
    return this.request<any>(`/v1/scan/history${queryString}`, {
      method: 'GET',
    });
  }

  async getReservationByQRToken(qrToken: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/scan/reservation/${encodeURIComponent(qrToken)}`, {
      method: 'GET',
    });
  }

  async scanHealthCheck(): Promise<ApiResponse<string>> {
    try {
      const token = await this.getToken();
      
      const headers: HeadersInit = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${this.baseURL}/v1/scan/health`, {
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

