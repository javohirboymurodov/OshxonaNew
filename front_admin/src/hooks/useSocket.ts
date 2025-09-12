import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';
import { useAppDispatch, useAppSelector } from './redux';
import { handleOrderUpdate, handleNewOrder, addArrival } from '../store/slices/ordersSlice';
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
    if (!realTimeUpdates || !user) {
      return;
    }

    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
                     import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 
                     'https://oshxonanew.onrender.com';
    
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    // Join admin room for real-time updates with token
    const token = localStorage.getItem('token');

    socket.emit('join-admin', { 
      token: token,
      branchId: branchId
    });

    // Listen for new orders
    socket.on('new-order', (data: unknown) => {
      // Convert data to order format if needed
      const orderData = (data as { order?: unknown })?.order || data;
      
      // Ensure we have required fields for Redux
      if (orderData && ((orderData as { _id?: string })._id || (orderData as { id?: string }).id || (orderData as { orderId?: string }).orderId)) {
        // Normalize the order data
        const normalizedOrder = {
          _id: (orderData as { _id?: string })._id || (orderData as { id?: string }).id || (orderData as { orderId?: string }).orderId || '',
          orderId: (orderData as { orderNumber?: string }).orderNumber || (orderData as { orderId?: string }).orderId || (orderData as { _id?: string })._id || '',
          status: ((orderData as { status?: string }).status || 'pending') as OrderStatus,
          total: (orderData as { total?: number }).total || 0,
          orderType: (orderData as { orderType?: string }).orderType || 'delivery',
          customerInfo: {
            name: (orderData as { customerName?: string }).customerName || ((orderData as { customer?: { name?: string } }).customer?.name) || 'Mijoz'
          },
          createdAt: (orderData as { createdAt?: string }).createdAt || new Date().toISOString(),
          updatedAt: (orderData as { updatedAt?: string }).updatedAt || new Date().toISOString(),
          items: (orderData as { items?: unknown[] }).items || [],
          paymentMethod: (orderData as { paymentMethod?: string }).paymentMethod || 'cash'
        };
        
        // We accept partially-typed payload since it comes from socket
        dispatch(handleNewOrder(normalizedOrder as unknown as never));
        
        // Play notification sound
        SoundPlayer.playNotification('/beep.wav', 0.8);
        
        // Show notification
        message.success({
          content: `🔔 Yangi buyurtma keldi - №${normalizedOrder.orderId}`,
          duration: 5,
        });
      } else {
        // Play notification sound even with insufficient data
        SoundPlayer.playNotification('/beep.wav', 0.8);
        
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
      details?: unknown;
    }) => {

      dispatch(handleOrderUpdate(data));
      
      // Show status update notification
      const statusMessages: Record<string, string> = {
        'pending': '⏳ Buyurtma kutilmoqda',
        'confirmed': '✅ Buyurtma tasdiqlandi',
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
    socket.on('courier-assigned', (data: { courierName?: string; orderId?: string }) => {
      message.success({
        content: `🚚 Kuryer tayinlandi - ${data.courierName || 'Kuryer'} buyurtma №${data.orderId}ga`,
        duration: 4,
      });
    });

    // Listen for customer arrival (dine-in)
    socket.on('customer-arrived', (data: { customer?: { name?: string }; orderNumber?: string; orderId?: string; tableNumber?: string; total?: number; branchId?: string }) => {
      message.info({
        content: `👋 Mijoz keldi - ${data.customer?.name || 'Mijoz'} (Buyurtma №${data.orderNumber || data.orderId})`,
        duration: 6,
      });

      // Bell ichida alohida arrivals ro'yxatiga yozamiz (newOrder emas)
      if (data.orderId || data.orderNumber) {
        dispatch(addArrival({
          orderId: String(data.orderId || data.orderNumber),
          orderNumber: data.orderNumber,
          tableNumber: data.tableNumber,
          customerName: data.customer?.name,
          total: data.total,
          branchId: data.branchId,
        }));
      }
    });

    // Connection status
    socket.on('connect', () => {
      // Re-join admin room after reconnection
      const token = localStorage.getItem('token');
      socket?.emit('join-admin', { 
        token: token,
        branchId: branchId
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error: unknown) => {
      console.error('Socket error:', error);
    });

    // Listen for authentication errors
    socket.on('auth-error', (error: unknown) => {
      console.error('Socket auth error:', error);
      // Token expire bo'lsa logout qilish
      localStorage.removeItem('token');
      window.location.href = '/login';
    });

    // Listen for successful admin join
    socket.on('joined-admin', () => {
      // Admin room joined successfully
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [dispatch, realTimeUpdates, branchId, user]);

  return {
    socket,
    connected: socket?.connected || false,
  };
};