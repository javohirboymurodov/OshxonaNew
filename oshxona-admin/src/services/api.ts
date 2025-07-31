// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, LoginResponse, PaginatedResponse } from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: '/api',
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

    // Response interceptor - error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
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
    await this.api.post('/auth/logout');
    localStorage.removeItem('token');
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data.data;
  }

  // User methods
  async getUsers(page = 1, limit = 10, role?: string) {
    let url = `/admin/users?page=${page}&limit=${limit}`;
    if (role && role !== 'all') {
      url += `&role=${role}`;
    }
    const response: AxiosResponse<ApiResponse<PaginatedResponse<User>>> = await this.api.get(url);
    return response.data.data!;
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

  // Category methods
  async getCategories(page = 1, limit = 10) {
    const response = await this.api.get(`/categories?page=${page}&limit=${limit}`);
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

  async reorderCategories(categoryIds: string[]) {
    const response = await this.api.post('/categories/reorder', { categoryIds });
    return response.data;
  }

  // Order methods
  async getOrders(page = 1, limit = 15, status?: string) {
    let url = `/admin/orders?page=${page}&limit=${limit}`;
    if (status && status !== 'all') {
      url += `&status=${status}`;
    }
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

  // Branch methods
  async getBranches() {
    const response = await this.api.get('/admin/branches');
    return response.data.data;
  }

  async createBranch(branchData: any) {
    const response = await this.api.post('/admin/branches', branchData);
    return response.data;
  }

  async updateBranch(id: string, branchData: any) {
    const response = await this.api.put(`/admin/branches/${id}`, branchData);
    return response.data;
  }

  async deleteBranch(id: string) {
    const response = await this.api.delete(`/admin/branches/${id}`);
    return response.data;
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
  async getDashboardStats() {
    const response = await this.api.get('/dashboard/stats');
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