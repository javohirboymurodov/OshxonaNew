import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';
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

    // Join admin room for real-time updates with token
    const token = localStorage.getItem('token');
    socket.emit('join-admin', { 
      token: token,
      branchId: 'default' // or get from user context
    });

    // Listen for new orders
    socket.on('new-order', (data: any) => {
      console.log('🔔 New order received:', data);
      if (data.order) {
        // Add new order to Redux store
        dispatch(handleNewOrder(data.order));
        
        // Show notification
        console.log('New order added to store:', data.order);
        message.success({
          content: `🔔 Yangi buyurtma keldi - №${data.order.orderNumber || data.order._id}`,
          duration: 5,
        });
      } else if (data.orderId && data.orderNumber) {
        console.log('New order notification (minimal data):', data);
      }
    });

    // Listen for order status updates  
    socket.on('order-status-updated', (data: {
      orderId: string;
      status: OrderStatus;
      statusName?: string;
      updatedAt: string;
      details?: any;
    }) => {
      console.log('🔄 Order status update:', data);
      dispatch(handleOrderUpdate(data));
      
      // Show status update notification
      const statusMessages = {
        'confirmed': '✅ Buyurtma tasdiqlandi',
        'preparing': '👨‍🍳 Buyurtma tayyorlanmoqda',
        'ready': '🍽️ Buyurtma tayyor',
        'assigned': '🚚 Kuryer tayinlandi', 
        'on_delivery': '🚗 Yetkazilmoqda',
        'delivered': '✅ Yetkazildi',
        'picked_up': '📦 Olib ketildi',
        'completed': '🎉 Buyurtma yakunlandi',
        'cancelled': '❌ Buyurtma bekor qilindi'
      };
      
      const statusMessage = statusMessages[data.status] || 'Holat o\'zgartirildi';
      message.info({
        content: `${statusMessage} - №${data.orderId}`,
        duration: 3,
      });
    });

    // Listen for courier assignments
    socket.on('courier-assigned', (data: any) => {
      console.log('🚚 Courier assigned:', data);
      message.success({
        content: `🚚 Kuryer tayinlandi - ${data.courierName || 'Kuryer'} buyurtma №${data.orderId}ga`,
        duration: 4,
      });
    });

    // Listen for customer arrival (dine-in)
    socket.on('customer-arrived', (data: any) => {
      console.log('👋 Customer arrived:', data);
      message.info({
        content: `👋 Mijoz keldi - ${data.customer?.name || 'Mijoz'} (Buyurtma №${data.orderNumber || data.orderId})`,
        duration: 6,
      });
    });

    // Connection status
    socket.on('connect', () => {
      console.log('✅ Socket connected');
      // Re-join admin room after reconnection
      const token = localStorage.getItem('token');
      socket.emit('join-admin', { 
        token: token,
        branchId: 'default'
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
    });

    // Listen for authentication errors
    socket.on('auth-error', (error: any) => {
      console.error('❌ Socket auth error:', error);
    });

    // Listen for successful admin join
    socket.on('joined-admin', (data: any) => {
      console.log('✅ Successfully joined admin room:', data);
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