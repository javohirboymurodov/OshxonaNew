import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrderStatus } from '../../utils/orderStatus';

export interface Order {
  _id: string;
  orderId: string;
  user?: { _id: string; firstName?: string; lastName?: string; telegramId?: number; phone?: string } | null;
  customerInfo?: { name?: string; phone?: string } | null;
  items: Array<{
    product: { _id: string; name: string; price: number; image?: string };
    quantity: number;
    price: number;
    total: number;
  }>;
  totalAmount?: number;
  total?: number;
  courier?: { firstName?: string; lastName?: string; phone?: string } | null;
  deliveryInfo?: { 
    address?: string;
    courier?: { firstName?: string; lastName?: string; phone?: string } | null;
  } | null;
  status: OrderStatus;
  orderType: 'delivery' | 'pickup' | 'dine_in' | 'table';
  paymentMethod: 'cash' | 'card' | 'online' | string;
  deliveryAddress?: string;
  deliveryMeta?: { distanceKm?: number | null; etaMinutes?: number | null; deliveryFee?: number | null };
  createdAt: string;
  updatedAt: string;
  statusHistory?: Array<{
    status: OrderStatus;
    message: string;
    timestamp: string;
    updatedBy?: string;
  }>;
}

interface OrdersState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  filters: {
    status?: OrderStatus;
    orderType?: string;
    courier?: string;
    dateRange?: [string, string];
  };
  realTimeUpdates: boolean;
  stats: {
    pending: number;
    confirmed: number;
    ready: number;
    delivered: number;
    cancelled: number;
  };
  statsLoading: boolean;
  newOrders: Order[];
  arrivals: Array<{
    orderId: string;
    orderNumber?: string;
    tableNumber?: string;
    customerName?: string;
    total?: number;
    branchId?: string;
    createdAt: string;
  }>;
}

// 🔧 FIX: newOrders ni localStorage dan yuklash
const loadNewOrdersFromStorage = (): Order[] => {
  try {
    const stored = localStorage.getItem('admin_new_orders');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Faqat oxirgi 2 soat ichidagi buyurtmalarni saqlaymiz
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      return parsed.filter((order: Order) => {
        const orderTime = new Date(order.createdAt).getTime();
        return orderTime > twoHoursAgo;
      });
    }
  } catch (error) {
    console.error('Error loading new orders from storage:', error);
  }
  return [];
};

// newOrders ni localStorage ga saqlash
const saveNewOrdersToStorage = (newOrders: Order[]) => {
  try {
    localStorage.setItem('admin_new_orders', JSON.stringify(newOrders));
  } catch (error) {
    console.error('Error saving new orders to storage:', error);
  }
};

const initialState: OrdersState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 15,
    total: 0,
  },
  filters: {},
  realTimeUpdates: true,
  stats: {
    pending: 0,
    confirmed: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  },
  statsLoading: false,
  newOrders: loadNewOrdersFromStorage(),
  arrivals: [],
};

// Async thunks for API calls
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params: { page?: number; limit?: number; status?: OrderStatus; orderType?: string; branchId?: string; search?: string; courier?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.orderType) searchParams.append('orderType', params.orderType);
    if (params.branchId) searchParams.append('branchId', params.branchId);
    if (params.search) searchParams.append('search', params.search);
    if (params.courier) searchParams.append('courier', params.courier);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiBaseUrl}/admin/orders?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch orders');
    return await response.json();
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ orderId, status, message }: { orderId: string; status: OrderStatus; message?: string }) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ status, message }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
    return await response.json();
  }
);

export const assignCourier = createAsyncThunk(
  'orders/assignCourier',
  async ({ orderId, courierId }: { orderId: string; courierId: string }) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/assign-courier`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ courierId }),
    });
    if (!response.ok) throw new Error('Failed to assign courier');
    return await response.json();
  }
);

export const fetchOrderStats = createAsyncThunk(
  'orders/fetchStats',
  async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiBaseUrl}/admin/orders/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch order stats');
    return await response.json();
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setSelectedOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
    
    setFilters: (state, action: PayloadAction<Partial<OrdersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    setPagination: (state, action: PayloadAction<Partial<OrdersState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // Real-time update handler
    handleOrderUpdate: (state, action: PayloadAction<{ 
      orderId: string; 
      status: OrderStatus; 
      statusName?: string; 
      updatedAt: string;
      courier?: { _id: string; firstName: string; lastName: string; phone: string };
    }>) => {
      const { orderId, status, updatedAt, courier } = action.payload;
      const orderIndex = state.orders.findIndex(order => order._id === orderId);
      
      if (orderIndex !== -1) {
        state.orders[orderIndex].status = status;
        state.orders[orderIndex].updatedAt = updatedAt;
        
        // 🔧 FIX: Kuryer ma'lumotini ham yangilash (assignment paytida)
        if (courier) {
          if (!state.orders[orderIndex].deliveryInfo) {
            state.orders[orderIndex].deliveryInfo = {};
          }
          state.orders[orderIndex].deliveryInfo!.courier = courier;
        }
        
        // Update status history if needed
        if (!state.orders[orderIndex].statusHistory) {
          state.orders[orderIndex].statusHistory = [];
        }
        
        // Add to status history
        state.orders[orderIndex].statusHistory?.push({
          status,
          message: action.payload.statusName || status,
          timestamp: updatedAt,
        });
      }
      
      // 🔧 FIX: selectedOrder ni socket update dan ajratish
      // Socket orqali kelgan status update selectedOrder ni o'zgartirmasin
      // Faqat modal ochiq bo'lgan paytda yangilash
      // Bu modal avtomatik ochilishini oldini oladi
    },
    
    // Handle new order
    handleNewOrder: (state, action: PayloadAction<Order>) => {

      state.orders.unshift(action.payload);
      state.pagination.total += 1;
      // Add to newOrders for notifications
      state.newOrders.unshift(action.payload);
      // Keep only last 10 new orders
      if (state.newOrders.length > 10) {
        state.newOrders = state.newOrders.slice(0, 10);
      }
      // 🔧 FIX: localStorage ga saqlash
      saveNewOrdersToStorage(state.newOrders);
    },

    // 👋 Customer arrived (dine_in/table) - persistent, lekin buyurtma qo'shmaymiz
    addArrival: (state, action: PayloadAction<{ orderId: string; orderNumber?: string; tableNumber?: string; customerName?: string; total?: number; branchId?: string }>) => {
      const id = action.payload.orderId;
      // 60 soniya ichida dublikatni yo'qotish
      const now = Date.now();
      state.arrivals = (state.arrivals || []).filter(a => (now - new Date(a.createdAt).getTime()) < 60000 && a.orderId !== id);
      state.arrivals.unshift({ ...action.payload, createdAt: new Date().toISOString() });
    },
    clearArrival: (state, action: PayloadAction<string>) => {
      state.arrivals = (state.arrivals || []).filter(a => a.orderId !== action.payload);
    },
    
    setRealTimeUpdates: (state, action: PayloadAction<boolean>) => {
      state.realTimeUpdates = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearNewOrders: (state) => {
      state.newOrders = [];
      // 🔧 FIX: localStorage tozalash
      saveNewOrdersToStorage([]);
    },
    
    dismissNewOrder: (state, action: PayloadAction<string>) => {
      state.newOrders = state.newOrders.filter(order => order._id !== action.payload);
      // 🔧 FIX: localStorage yangilash
      saveNewOrdersToStorage(state.newOrders);
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload.data || action.payload;
        state.orders = data.orders || [];
        state.pagination.total = data.pagination?.total || 0;
        state.pagination.current = data.pagination?.current || 1;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      })
      
      // Update status
      .addCase(updateOrderStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const data = action.payload.data || action.payload;
        const updatedOrder = data.order || action.payload.order;
        if (updatedOrder) {
          const orderIndex = state.orders.findIndex(order => order._id === updatedOrder._id);
          if (orderIndex !== -1) {
            state.orders[orderIndex] = updatedOrder;
          }
          if (state.selectedOrder && state.selectedOrder._id === updatedOrder._id) {
            state.selectedOrder = updatedOrder;
          }
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update order status';
      })
      
      // Assign courier
      .addCase(assignCourier.pending, (state) => {
        state.error = null;
      })
      .addCase(assignCourier.fulfilled, (state, action) => {
        const data = action.payload.data || action.payload;
        const updatedOrder = data.order || action.payload.order;
        if (updatedOrder) {
          const orderIndex = state.orders.findIndex(order => order._id === updatedOrder._id);
          if (orderIndex !== -1) {
            state.orders[orderIndex] = updatedOrder;
          }
          if (state.selectedOrder && state.selectedOrder._id === updatedOrder._id) {
            state.selectedOrder = updatedOrder;
          }
        }
      })
      .addCase(assignCourier.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to assign courier';
      })
      
      // Fetch stats
      .addCase(fetchOrderStats.pending, (state) => {
        state.statsLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        const data = action.payload.data || action.payload;
        const stats = data.stats || data;
        state.stats = {
          pending: Number(stats?.pending) || 0,
          confirmed: Number(stats?.confirmed) || 0,
          ready: Number(stats?.ready) || 0,
          delivered: Number(stats?.delivered) || 0,
          cancelled: Number(stats?.cancelled) || 0,
        };
      })
      .addCase(fetchOrderStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.error.message || 'Failed to fetch order stats';
      });
  },
});

export const {
  setSelectedOrder,
  setFilters,
  clearFilters,
  setPagination,
  handleOrderUpdate,
  handleNewOrder,
  addArrival,
  clearArrival,
  setRealTimeUpdates,
  clearError,
  clearNewOrders,
  dismissNewOrder,
} = ordersSlice.actions;

export default ordersSlice.reducer;