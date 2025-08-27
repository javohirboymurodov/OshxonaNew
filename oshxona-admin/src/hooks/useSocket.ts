import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from './redux';
import { handleOrderUpdate, handleNewOrder } from '../store/slices/ordersSlice';
import { OrderStatus } from '../utils/orderStatus';

let socket: Socket | null = null;

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const realTimeUpdates = useAppSelector(state => state.orders.realTimeUpdates);

  useEffect(() => {
    if (!realTimeUpdates) return;

    // Initialize socket connection
    socket = io(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });

    // Join admin room for real-time updates
    socket.emit('join-admin', { 
      branchId: 'default', // or get from user context
      adminId: 'admin-user' // or get from auth context
    });

    // Listen for new orders
    socket.on('new-order', (data: any) => {
      console.log('🔔 New order received:', data);
      if (data.orderId && data.orderNumber) {
        // Optionally fetch full order details or handle with provided data
        console.log('New order notification:', data);
      }
    });

    // Listen for order status updates  
    socket.on('order-status-update', (data: {
      orderId: string;
      status: OrderStatus;
      statusName?: string;
      updatedAt: string;
      details?: any;
    }) => {
      console.log('🔄 Order status update:', data);
      dispatch(handleOrderUpdate(data));
    });

    // Listen for courier assignments
    socket.on('courier-assigned', (data: any) => {
      console.log('🚚 Courier assigned:', data);
      // Refresh orders or update specific order
    });

    // Connection status
    socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [dispatch, realTimeUpdates]);

  return {
    socket,
    connected: socket?.connected || false,
  };
};