import { BaseApiService } from './base';
import { ApiResponse, UserDTO } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class UserApiService extends BaseApiService {
  // ========== USER API METHODS (User Service) ==========

  async getAllUsers(): Promise<ApiResponse<UserDTO[]>> {
    try {
      const token = await this.getToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${this.baseURL}/users`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP error! status: ${response.status}, message: ${errorText}`,
        };
      }

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        data = text ? JSON.parse(text) : [];
      } else {
        const text = await response.text();
        data = text ? JSON.parse(text) : [];
      }

      // Handle different response formats:
      // - Direct array: [...]
      // - ResponseDTO: { data: [...], message: "...", success: true }
      // - Spring Boot Page: { content: [...], totalElements: ... }
      const users = Array.isArray(data) 
        ? data 
        : (data.data || data.content || data.users || []);

      return {
        success: true,
        data: users,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  // Get Current User - GET /api/v1/user
  // Description: Get current authenticated user information, wrapped in ResponseDTO
  // Authentication: Required (USER, VENDOR, or ADMIN role)
  // Response: ResponseDTO containing UserDTO
  async getCurrentUser(): Promise<ApiResponse<UserDTO>> {
    // Base request method already unwraps ResponseDTO
    return this.request<UserDTO>('/v1/user', {
      method: 'GET',
    });
  }

  // Complete Profile - POST /api/v1/user/complete-profile
  // Description: Complete user profile by updating mobile number
  // Authentication: Required (USER role)
  // Request: { mobile }
  // Response: ResponseDTO with success/error message
  async completeProfile(mobile: string): Promise<ApiResponse<any>> {
    // Base request method already unwraps ResponseDTO
    return this.request<any>('/v1/user/complete-profile', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });
  }

  // User Health Check - GET /api/v1/user/health
  // Description: Health check for User Service
  // Response: text/plain "User Service is running!"
  async userHealthCheck(): Promise<ApiResponse<string>> {
    try {
      const token = await this.getToken();
      
      const headers: HeadersInit = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${this.baseURL}/v1/user/health`, {
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

  // ========== LEGACY METHODS (for backward compatibility) ==========

  // Get User by ID - Legacy method
  // Note: This endpoint may not exist in the new API, but kept for backward compatibility
  async getUser(userId: string | number): Promise<ApiResponse<UserDTO>> {
    // Try to get current user first (new API)
    const currentUserResponse = await this.getCurrentUser();
    if (currentUserResponse.success && currentUserResponse.data) {
      // If the current user ID matches, return it
      if (currentUserResponse.data.id?.toString() === userId.toString()) {
        return currentUserResponse;
      }
    }
    
    // Fallback: try old endpoint format
    return this.request<UserDTO>(`/v1/user?userId=${userId}`, {
      method: 'GET',
    });
  }

  // Get User by ID (raw) - Legacy method
  async getUserRaw(userId: string | number): Promise<ApiResponse<UserDTO>> {
    return this.request<UserDTO>(`/v1/user/get-user?userId=${userId}`, {
      method: 'GET',
    });
  }

  // Validate User ID - Legacy method
  async validateUserId(userId: string | number): Promise<ApiResponse<boolean>> {
    return this.request<boolean>(`/v1/user/${userId}/validate`, {
      method: 'GET',
    });
  }

  // Get current user profile (using new API)
  async getProfile(): Promise<ApiResponse<UserDTO>> {
    return this.getCurrentUser();
  }

  // Update user profile
  // Note: Update endpoint not available in User Service API yet
  // This updates local storage for now
  async updateProfile(
    name: string,
    avatar?: string
  ): Promise<ApiResponse<UserDTO>> {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      // TODO: Add PUT /api/v1/user endpoint when available
      // For now, return success with updated data for local storage update
      return { success: true, data: { ...user, name, avatar } };
    }
    return { success: false, error: 'User not found' };
  }
}

