import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';
import { useAppDispatch, useAppSelector } from './redux';
import { handleOrderUpdate, handleNewOrder } from '../store/slices/ordersSlice';
import { OrderStatus } from '../utils/orderStatus';
import { useAuth } from './useAuth';
import { SoundPlayer } from '@/utils/sound';

let socket: Socket | null = null;

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const realTimeUpdates = useAppSelector(state => state.orders.realTimeUpdates);
  const { user } = useAuth();
  
  // Extract branchId to avoid reconnecting when other user properties change
  const branchId = user?.branch && typeof user.branch === 'object' ? user.branch._id : user?.branch || 'default';

  useEffect(() => {
    console.log('🔧 useSocket useEffect triggered:', { 
      realTimeUpdates, 
      user: !!user, 
      branchId,
      userRole: user?.role 
    });

    if (!realTimeUpdates || !user) {
      console.log('❌ useSocket early return:', { realTimeUpdates, user: !!user });
      return;
    }

    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    console.log('🚀 Initializing socket connection to:', socketUrl);
    
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    // Join admin room for real-time updates with token
    const token = localStorage.getItem('token');
    console.log('🔑 Token available:', !!token);
    console.log('🏢 Joining admin room with branchId:', branchId);

    socket.emit('join-admin', { 
      token: token,
      branchId: branchId
    });

    // Listen for new orders
    socket.on('new-order', (data: any) => {
      console.log('🔔 NEW ORDER EVENT RECEIVED:', data);
      console.log('🔔 Raw data type:', typeof data);
      console.log('🔔 Data keys:', Object.keys(data || {}));

      
      // Convert data to order format if needed
      let orderData = data.order || data;
      console.log('🔔 Processing orderData:', orderData);
      
      // Ensure we have required fields for Redux
      if (orderData && (orderData._id || orderData.id || orderData.orderId)) {
        // Normalize the order data
        const normalizedOrder = {
          _id: orderData._id || orderData.id || orderData.orderId,
          orderId: orderData.orderNumber || orderData.orderId || orderData._id,
          status: orderData.status || 'pending',
          total: orderData.total || 0,
          orderType: orderData.orderType || 'delivery',
          customerInfo: {
            name: orderData.customerName || orderData.customer?.name || 'Mijoz'
          },
          createdAt: orderData.createdAt || new Date().toISOString(),
          updatedAt: orderData.updatedAt || new Date().toISOString(),
          items: orderData.items || [],
          paymentMethod: orderData.paymentMethod || 'cash'
        };
        
        console.log('🔔 Dispatching handleNewOrder with:', normalizedOrder);
        dispatch(handleNewOrder(normalizedOrder));
        
        // Play notification sound
        console.log('🔔 Playing notification sound...');
        SoundPlayer.playNotification('/notification.wav', 0.8);
        
        // Show notification
        console.log('🔔 Showing Antd message notification...');
        message.success({
          content: `🔔 Yangi buyurtma keldi - №${normalizedOrder.orderId}`,
          duration: 5,
        });
      } else {

        
        // Play notification sound even with insufficient data

        SoundPlayer.playNotification('/notification.wav', 0.8);
        
        // Still show notification even if we can't add to store
        message.success({
          content: `🔔 Yangi buyurtma keldi`,
          duration: 5,
        });
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

      message.success({
        content: `🚚 Kuryer tayinlandi - ${data.courierName || 'Kuryer'} buyurtma №${data.orderId}ga`,
        duration: 4,
      });
    });

    // Listen for customer arrival (dine-in)
    socket.on('customer-arrived', (data: any) => {

      message.info({
        content: `👋 Mijoz keldi - ${data.customer?.name || 'Mijoz'} (Buyurtma №${data.orderNumber || data.orderId})`,
        duration: 6,
      });
    });

    // Connection status
    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      console.log('🔄 Socket ID:', socket.id);
      // Re-join admin room after reconnection
      const token = localStorage.getItem('token');
      console.log('🔄 Re-joining admin room with branchId:', branchId);
      socket.emit('join-admin', { 
        token: token,
        branchId: branchId
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
  }, [dispatch, realTimeUpdates, branchId]);

  return {
    socket,
    connected: socket?.connected || false,
  };
};