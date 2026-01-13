import { BaseApiService } from './base';
import { ApiResponse, Event, EventCreateRequest, EventSearchParams, EventQueryParams, PaginatedResponse } from './types';
import { API_CONFIG } from '../../constants';

export class EventApiService extends BaseApiService {
  // ========== EVENT API METHODS (Event Service) ==========

  async getEventById(id: string | number): Promise<ApiResponse<Event>> {
    return this.request<Event>(`/v1/event/${id}`, {
      method: 'GET',
    });
  }

  async getAllEvents(params?: EventQueryParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Event>>(`/v1/event${queryString}`, {
      method: 'GET',
    });
  }

  async getScheduledEvents(params?: EventQueryParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Event>>(`/v1/event/scheduled${queryString}`, {
      method: 'GET',
    });
  }

  async searchEvents(params?: EventSearchParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Event>>(`/v1/event/search${queryString}`, {
      method: 'GET',
    });
  }

  async advancedSearchEvents(params?: EventSearchParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.request<PaginatedResponse<Event>>(`/v1/event/advanced-search${queryString}`, {
      method: 'GET',
    });
  }

  async updateEvent(id: string | number, eventData: EventCreateRequest): Promise<ApiResponse<Event>> {
    return this.request<Event>(`/v1/event/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async publishEvent(id: string | number): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/event/${id}/publish`, {
      method: 'POST',
    });
  }

  async cancelEvent(id: string | number, reason?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/event/${id}/cancel`, {
      method: 'POST',
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  }

  async eventHealthCheck(): Promise<ApiResponse<string>> {
    try {
      const token = await this.getToken();
      
      const headers: HeadersInit = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${this.baseURL}/v1/event/health`, {
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

  // ========== PUBLIC EVENT API METHODS (No Authentication Required) ==========

  protected async publicRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.TIMEOUT
    );

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      };

      const url = `${this.baseURL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();
      let data: any = text;

      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          return {
            success: false,
            error: 'Invalid JSON response from server',
            data: null,
          };
        }
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || response.statusText || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage,
          message: data.message,
        };
      }

      let extractedData: any;
      if (data && typeof data === 'object') {
        if ('data' in data && data.data !== null && data.data !== undefined) {
          extractedData = data.data;
        } else if ('content' in data && data.content !== null && data.content !== undefined) {
          extractedData = data.content;
        } else {
          extractedData = data;
        }
      } else {
        extractedData = data;
      }

      return {
        success: true,
        data: extractedData,
        message: (data as any).message,
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout. Please check your connection and try again.',
        };
      }

      return {
        success: false,
        error: error?.message || 'Network request failed',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getPublicEvent(id?: string | number, slug?: string): Promise<ApiResponse<Event>> {
    const params: Record<string, any> = {};
    if (id) {
      params.id = id;
    } else if (slug) {
      params.slug = slug;
    }
    const queryString = this.buildQueryString(params);
    return this.publicRequest<Event>(`/v1/public/event${queryString}`, {
      method: 'GET',
    });
  }

  async getAllPublicEvents(params?: EventQueryParams & { category?: string }): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.publicRequest<PaginatedResponse<Event>>(`/v1/public/event/get-all${queryString}`, {
      method: 'GET',
    });
  }

  async getScheduledPublicEvents(params?: EventQueryParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.publicRequest<PaginatedResponse<Event>>(`/v1/public/event/scheduled${queryString}`, {
      method: 'GET',
    });
  }

  async searchPublicEvents(params?: EventSearchParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.publicRequest<PaginatedResponse<Event>>(`/v1/public/event/search${queryString}`, {
      method: 'GET',
    });
  }

  async advancedSearchPublicEvents(params?: EventSearchParams): Promise<ApiResponse<PaginatedResponse<Event>>> {
    const queryString = this.buildQueryString(params || {});
    return this.publicRequest<PaginatedResponse<Event>>(`/v1/public/event/advanced-search${queryString}`, {
      method: 'GET',
    });
  }

  async publicEventHealthCheck(): Promise<ApiResponse<string>> {
    try {
      const response = await fetch(`${this.baseURL}/v1/public/event/health`, {
        method: 'GET',
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