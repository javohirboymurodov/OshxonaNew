import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrderStatus } from '../../utils/orderStatus';

export interface Order {
  _id: string;
  orderNumber: string;
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
  deliveryInfo?: { courier?: { firstName?: string; lastName?: string; phone?: string } | null } | null;
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
}

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
};

// Async thunks for API calls
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params: { page?: number; limit?: number; status?: OrderStatus; orderType?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.orderType) searchParams.append('orderType', params.orderType);

    const response = await fetch(`/api/orders?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return await response.json();
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ orderId, status, message }: { orderId: string; status: OrderStatus; message?: string }) => {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, message }),
    });
    if (!response.ok) throw new Error('Failed to update order status');
    return await response.json();
  }
);

export const assignCourier = createAsyncThunk(
  'orders/assignCourier',
  async ({ orderId, courierId }: { orderId: string; courierId: string }) => {
    const response = await fetch(`/api/orders/${orderId}/assign-courier`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courierId }),
    });
    if (!response.ok) throw new Error('Failed to assign courier');
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
    handleOrderUpdate: (state, action: PayloadAction<{ orderId: string; status: OrderStatus; statusName?: string; updatedAt: string }>) => {
      const { orderId, status, updatedAt } = action.payload;
      const orderIndex = state.orders.findIndex(order => order._id === orderId);
      
      if (orderIndex !== -1) {
        state.orders[orderIndex].status = status;
        state.orders[orderIndex].updatedAt = updatedAt;
        
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
      
      // Update selected order if it's the same
      if (state.selectedOrder && state.selectedOrder._id === orderId) {
        state.selectedOrder.status = status;
        state.selectedOrder.updatedAt = updatedAt;
      }
    },
    
    // Handle new order
    handleNewOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
      state.pagination.total += 1;
    },
    
    setRealTimeUpdates: (state, action: PayloadAction<boolean>) => {
      state.realTimeUpdates = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
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
        state.orders = action.payload.orders || [];
        state.pagination.total = action.payload.total || 0;
        state.pagination.current = action.payload.page || 1;
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
        const updatedOrder = action.payload.order;
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
        const updatedOrder = action.payload.order;
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
  setRealTimeUpdates,
  clearError,
} = ordersSlice.actions;

export default ordersSlice.reducer;