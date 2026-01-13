import { BaseApiService } from './base';
import { ApiResponse, StripePaymentRequest, StripePaymentResponse, StripeRefundRequest } from './types';

export class PaymentApiService extends BaseApiService {
  async createStripePayment(
    reservationId: number,
    amount: number,
    currency: string = 'USD',
    userId: string | number
  ): Promise<ApiResponse<StripePaymentResponse>> {
    const requestBody: StripePaymentRequest = {
      reservationId,
      amount,
      currency,
    };

    return this.request<StripePaymentResponse>('/v1/payment/stripe/create', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async refundStripePayment(reservationId: number, reason: string): Promise<ApiResponse<any>> {
    const requestBody: StripeRefundRequest = {
      reservationId,
      reason,
    };

    return this.request<any>('/v1/payment/stripe/refund', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }
  async getUserPayments(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/v1/payment/stripe/user-payments', {
      method: 'GET',
    });
  }

  async verifyPayment(intentId: string): Promise<ApiResponse<any>> {
    const requestBody = {
      intentId,
    };

    return this.request<any>('/v1/payment/stripe/verify-payment', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }
  async paymentHealthCheck(): Promise<ApiResponse<string>> {
    try {
      const token = await this.getToken();
      
      const headers: HeadersInit = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${this.baseURL}/v1/payment/health`, {
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

