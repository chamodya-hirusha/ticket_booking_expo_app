import { API_CONFIG } from '../../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from './types';

// Token storage key
const TOKEN_KEY = 'TOKEN';

export class BaseApiService {
  protected baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  // Get stored auth token
  protected async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  // Store auth token
  public async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch { }
  }

  // Remove auth token
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch { }
  }

  // Generic API request
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_CONFIG.TIMEOUT
    );

    try {
      const token = await this.getToken();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      // Check for API Gateway response format
      const apiCode = data?.code;
      const isSuccessByCode = apiCode === '00' || apiCode === 'SUCCESS';
      const isErrorByCode = apiCode && apiCode !== '00' && apiCode !== 'SUCCESS';

      const isSuccess = response.ok && (!apiCode || isSuccessByCode);

      if (!isSuccess) {
        const errorMessage = data.message || data.error || response.statusText || `HTTP ${response.status}`;

        return {
          success: false,
          error: errorMessage,
          message: data.message,
          data: {
            ...data,
            _status: response.status,
          },
        } as any;
      }

      // Capture and persist token if present
      const tokenFromResponse =
        data?.data?.content?.token ??
        data?.data?.token ??
        data?.content?.token ??
        data?.token;

      if (typeof tokenFromResponse === 'string' && tokenFromResponse.length > 0) {
        await this.setToken(tokenFromResponse);
      }

      // Extract data
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

  protected buildQueryString(params: Record<string, any>): string {
    const query = new URLSearchParams();

    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });

    return query.toString() ? `?${query.toString()}` : '';
  }
}