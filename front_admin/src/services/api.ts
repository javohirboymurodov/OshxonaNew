// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, LoginResponse } from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    // Development da proxy orqali /api ishlatamiz
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - token qo'shish
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - error handling with token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            console.log('🔄 Token expired, attempting refresh...');
            const newToken = await this.refreshToken();
            localStorage.setItem('token', newToken);
            
            // Update the authorization header and retry
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(email: string, password: string): Promise<LoginResponse> {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await this.api.post('/auth/login', {
      email,
      password,
    });
    return response.data.data!;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
    }
  }

  async refreshToken(): Promise<string> {
    const response: AxiosResponse<ApiResponse<{ token: string }>> = await this.api.post('/auth/refresh');
    return response.data.data!.token;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data.data;
  }

  // User methods
  async getUsers(page = 1, limit = 15, filters?: { search?: string; role?: string; status?: string }) {
    let url = `/admin/users?page=${page}&limit=${limit}`;
    if (filters?.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters?.role && filters.role !== 'all') url += `&role=${filters.role}`;
    if (filters?.status) url += `&status=${filters.status}`;
    const response = await this.api.get(url);
    return response.data.data;
  }

  async getUserStats() {
    const response = await this.api.get('/admin/users/stats');
    return response.data.data;
  }

  async createUser(userData: any) {
    const response = await this.api.post('/admin/users', userData);
    return response.data;
  }

  async updateUser(id: string, userData: any) {
    const response = await this.api.put(`/admin/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.api.delete(`/admin/users/${id}`);
    return response.data;
  }

  async toggleUserStatus(id: string) {
    const response = await this.api.patch(`/admin/users/${id}/toggle-status`);
    return response.data;
  }

  async blockUser(id: string) {
    const response = await this.api.patch(`/admin/users/${id}/block`);
    return response.data;
  }

  async unblockUser(id: string) {
    const response = await this.api.patch(`/admin/users/${id}/unblock`);
    return response.data;
  }

  // Product methods
  async getProducts(page = 1, limit = 10, category?: string) {
    let url = `/admin/products?page=${page}&limit=${limit}`;
    if (category && category !== 'all') {
      url += `&category=${category}`;
    }
    const response = await this.api.get(url);
    return response.data.data;
  }

  async getProductStats() {
    const response = await this.api.get('/admin/products/stats');
    return response.data.data;
  }

  async createProduct(productData: FormData) {
    const response = await this.api.post('/admin/products', productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateProduct(id: string, productData: FormData) {
    const response = await this.api.put(`/admin/products/${id}`, productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteProduct(id: string) {
    const response = await this.api.delete(`/admin/products/${id}`);
    return response.data;
  }

  async toggleProductStatus(id: string) {
    const response = await this.api.patch(`/admin/products/${id}/toggle-status`);
    return response.data;
  }

  // Inventory (per-branch) methods
  async updateInventory(branchId: string, productId: string, payload: Partial<{ isAvailable: boolean; priceOverride: number | null }>) {
    const response = await this.api.patch(`/admin/branches/${branchId}/products/${productId}`, payload);
    return response.data;
  }

  async getInventory(branchId: string, productIds?: string[]) {
    const qp = new URLSearchParams();
    if (productIds && productIds.length) qp.set('productIds', productIds.join(','));
    const response = await this.api.get(`/admin/branches/${branchId}/inventory${qp.toString() ? `?${qp.toString()}` : ''}`);
    return response.data.data;
  }

  // Category methods
  async getCategories(page = 1, limit = 10, params?: any) {
    console.log('🏷️ getCategories called with:', { page, limit, params });
    let url = `/categories?page=${page}&limit=${limit}`;
    if (params?.search && params.search.trim()) url += `&search=${encodeURIComponent(params.search.trim())}`;
    if (params?.status && params.status !== 'all') url += `&status=${params.status}`;
    if (params?.visibility && params.visibility !== 'all') url += `&visibility=${params.visibility}`;
    if (params?.branch) url += `&branch=${params.branch}`;
    console.log('🌐 Categories API URL:', url);
    const response = await this.api.get(url);
    console.log('📦 Categories API Response:', response.data);
    return response.data.data;
  }

  async getPublicCategories() {
    const response = await this.api.get('/categories/public');
    return response.data.data;
  }

  async createCategory(categoryData: any) {
    const response = await this.api.post('/categories', categoryData);
    return response.data;
  }

  async updateCategory(id: string, categoryData: any) {
    const response = await this.api.put(`/categories/${id}`, categoryData);
    return response.data;
  }

  async deleteCategory(id: string) {
    const response = await this.api.delete(`/categories/${id}`);
    return response.data;
  }

  async toggleCategoryStatus(id: string) {
    const response = await this.api.patch(`/categories/${id}/toggle-status`);
    return response.data;
  }

  async toggleCategoryVisibility(id: string) {
    const response = await this.api.patch(`/categories/${id}/toggle-visibility`);
    return response.data;
  }

  async reorderCategories(categoryIds: string[]) {
    const response = await this.api.post('/categories/reorder', { categoryIds });
    return response.data;
  }

  // Order methods
  async getOrders(
    page = 1,
    limit = 15,
    filters?: {
      status?: string;
      orderType?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      courier?: 'assigned' | 'unassigned';
      branch?: string;
    }
  ) {
    let url = `/admin/orders?page=${page}&limit=${limit}`;
    if (filters?.status && filters.status !== 'all') url += `&status=${filters.status}`;
    if (filters?.orderType && filters.orderType !== 'all') url += `&orderType=${filters.orderType}`;
    if (filters?.dateFrom) url += `&dateFrom=${encodeURIComponent(filters.dateFrom)}`;
    if (filters?.dateTo) url += `&dateTo=${encodeURIComponent(filters.dateTo)}`;
    if (filters?.search) url += `&search=${encodeURIComponent(filters.search)}`;
    if (filters?.courier) url += `&courier=${filters.courier}`;
    if (filters?.branch) url += `&branch=${encodeURIComponent(filters.branch)}`;
    const response = await this.api.get(url);
    return response.data.data;
  }

  async getOrderStats() {
    const response = await this.api.get('/admin/orders/stats');
    return response.data.data;
  }

  async getOrderById(id: string) {
    const response = await this.api.get(`/admin/orders/${id}`);
    return response.data.data;
  }

  async updateOrderStatus(id: string, status: string) {
    const response = await this.api.patch(`/admin/orders/${id}/status`, { status });
    return response.data;
  }

  async assignCourier(orderId: string, courierId: string) {
    const response = await this.api.patch(`/admin/orders/${orderId}/assign-courier`, { courierId });
    return response.data;
  }

  // Couriers (admin)
  async getCouriers(status?: 'online'|'offline'|'available') {
    let url = '/couriers';
    if (status) url += `?status=${status}`;
    const response = await this.api.get(url);
    return response.data.data;
  }

  async getAvailableCouriersForOrder() {
    const response = await this.api.get('/couriers/available/for-order');
    return response.data.data;
  }

  // 🔧 YANGI: Kuryer lokatsiyalarini real-time'da yangilash
  async refreshCourierLocations() {
    const response = await this.api.post('/couriers/locations/refresh');
    return response.data;
  }

  // Branch methods
  async getBranches() {
    try {
      const response = await this.api.get('/superadmin/branches');
      return response.data.data;
    } catch (e: any) {
      if (e?.response?.status === 403) {
        // Adminlar uchun fallback - 403 xatosi kutilmoqda, shuning uchun console'ga chiqarmaymiz
        try {
          const alt = await this.api.get('/admin/branches');
          return alt.data.data;
        } catch (fallbackError) {
          console.error('Failed to get branches from admin endpoint:', fallbackError);
          throw fallbackError;
        }
      }
      throw e;
    }
  }

  async createBranch(branchData: any) {
    const response = await this.api.post('/superadmin/branches', branchData);
    return response.data;
  }

  async updateBranch(id: string, branchData: any) {
    const response = await this.api.put(`/superadmin/branches/${id}`, branchData);
    return response.data;
  }

  async deleteBranch(id: string) {
    const response = await this.api.delete(`/superadmin/branches/${id}`);
    return response.data;
  }

  // Tables
  async getTables(params?: { page?: number; limit?: number; search?: string }) {
    const qp = new URLSearchParams();
    if (params?.page) qp.set('page', String(params.page));
    if (params?.limit) qp.set('limit', String(params.limit));
    if (params?.search) qp.set('search', String(params.search));
    const response = await this.api.get(`/tables${qp.toString() ? `?${qp.toString()}` : ''}`);
    return response.data.data;
  }
  async createTable(payload: { number: number; capacity?: number; location?: string; branch?: string }) {
    const response = await this.api.post('/tables', payload);
    return response.data.data;
  }
  async updateTable(id: string, payload: Partial<{ number: number; capacity: number; location: string; isActive: boolean }>) {
    const response = await this.api.patch(`/tables/${id}`, payload);
    return response.data.data;
  }
  async deleteTable(id: string) {
    const response = await this.api.delete(`/tables/${id}`);
    return response.data.data;
  }
  getTableQrPdfUrl(id: string) {
    const base = (this.api.defaults.baseURL || '').replace(/\/api$/, '');
    const token = localStorage.getItem('token') || '';
    const qp = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/api/tables/${id}/qr-pdf${qp}`;
  }

  // Settings methods
  async getSettings() {
    const response = await this.api.get('/admin/settings');
    return response.data.data;
  }

  async updateSettings(settingsData: any) {
    const response = await this.api.put('/admin/settings', settingsData);
    return response.data;
  }

  // Dashboard methods
  async getDashboardStats(params?: { branch?: string }) {
    const qp = params?.branch ? `?branch=${encodeURIComponent(params.branch)}` : '';
    const response = await this.api.get(`/dashboard/stats${qp}`);
    return response.data.data;
  }

  // Generic methods
  async get<T>(url: string): Promise<T> {
    const response = await this.api.get(url);
    return response.data.data;
  }

  async post<T>(url: string, data: any): Promise<T> {
    const response = await this.api.post(url, data);
    return response.data.data;
  }

  async put<T>(url: string, data: any): Promise<T> {
    const response = await this.api.put(url, data);
    return response.data.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete(url);
    return response.data.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch(url, data);
    return response.data.data;
  }
}

export const apiService = new ApiService();
export default apiService;