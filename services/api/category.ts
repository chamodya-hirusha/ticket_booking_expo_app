import { BaseApiService } from './base';
import { ApiResponse, Category } from './types';

export class CategoryApiService extends BaseApiService {
    /**
     * Get all categories
     */
    async getAllCategories(): Promise<ApiResponse<Category[]>> {
        return this.request<Category[]>('/v1/categories');
    }

    /**
     * Get all public categories
     */
    async getPublicCategories(): Promise<ApiResponse<Category[]>> {
        return this.request<Category[]>('/v1/categories/public');
    }

    /**
     * Get all event categories (Strings)
     * For backward compatibility with Home/Explore logic
     */
    async getEventCategories(): Promise<ApiResponse<string[]>> {
        const response = await this.getPublicCategories();
        if (response.success && response.data) {
            return {
                success: true,
                data: response.data.map(cat => cat.name),
                message: response.message
            };
        }
        return {
            success: false,
            error: response.error,
            message: response.message
        };
    }
}