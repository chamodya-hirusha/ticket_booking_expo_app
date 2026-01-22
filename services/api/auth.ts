import { BaseApiService } from './base';
import { ApiResponse, LoginResponseDTO, SignInResponse, SignUpResponse } from './types';

export class AuthApiService extends BaseApiService {

  async login(email: string, password: string): Promise<ApiResponse<LoginResponseDTO>> {
    const response = await this.request<LoginResponseDTO>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = response.data?.token || (response.data as any)?.content?.token;
    if (response.success && token) {
      await this.setToken(token);
    }

    return response;
  }

  async register(
    name: string,
    password: string,
    email: string,
    phone: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username: email, password, email, phone }),
    });
  }

  async verifyAccount(email: string, otp: string): Promise<ApiResponse<any>> {
    const response = await this.request<any>('/v1/auth/verify-account', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });

    if (response.success && response.data) {
      const token =
        response.data?.token ||
        response.data?.content?.token ||
        (typeof response.data === 'string' ? response.data : null);

      if (token && typeof token === 'string') {
        await this.setToken(token);
      }
    }

    return response;
  }

  async resendVerify(email: string): Promise<ApiResponse<any>> {
    return this.request<any>('/v1/auth/resend-verify', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<any>> {
    return this.request<any>('/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, password: string, otp: string): Promise<ApiResponse<any>> {
    return this.request<any>('/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, password, otp }),
    });
  }

  async userLogin(email: string, password: string): Promise<ApiResponse<LoginResponseDTO>> {
    const response = await this.request<LoginResponseDTO>('/v1/auth/user/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = response.data?.token || (response.data as any)?.content?.token;
    if (response.success && token) {
      await this.setToken(token);
    }

    return response;
  }

  async vendorLogin(email: string, password: string): Promise<ApiResponse<LoginResponseDTO>> {
    const response = await this.request<LoginResponseDTO>('/v1/auth/vendor/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = response.data?.token || (response.data as any)?.content?.token;
    if (response.success && token) {
      await this.setToken(token);
    }

    return response;
  }

  async registerVendor(
    name: string,
    password: string,
    email: string,
    phone: string,
    website: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>('/v1/auth/vendor/register', {
      method: 'POST',
      body: JSON.stringify({ name, username: email, password, email, phone, website }),
    });
  }

  async sendContactMessage(
    name: string,
    email: string,
    subject: string,
    message: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>('/v1/auth/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, subject, message }),
    });
  }

  async signOut(): Promise<void> {
    await this.removeToken();
  }

  async signIn(email: string, password: string): Promise<ApiResponse<SignInResponse>> {
    const loginResponse = await this.login(email, password);

    if (loginResponse.success && loginResponse.data) {
      const loginData = loginResponse.data as any;
      const userObj = {
        id: loginData.userId?.toString() || '',
        name: loginData.username || email.split('@')[0],
        email: email,
      };

      return {
        success: true,
        data: {
          user: userObj,
          token: loginData.token || '',
        },
        message: loginResponse.message,
      };
    }

    return {
      success: false,
      error: loginResponse.error || 'Login failed',
      message: loginResponse.message,
    };
  }

  async signUp(
    name: string,
    email: string,
    password: string,
    phone: string
  ): Promise<ApiResponse<SignUpResponse>> {
    const registerResponse = await this.register(name, password, email, phone);

    if (registerResponse.success) {
      const loginResponse = await this.login(email, password);

      if (loginResponse.success && loginResponse.data) {
        const loginData = loginResponse.data as any;
        return {
          success: true,
          data: {
            user: {
              id: loginData.userId?.toString() || '',
              name: name,
              email: email,
              phone: phone,
            },
            token: loginData.token || '',
          },
          message: registerResponse.message,
        };
      }
    }

    return {
      success: false,
      error: registerResponse.error || 'Registration failed',
      message: registerResponse.message,
    };
  }
}