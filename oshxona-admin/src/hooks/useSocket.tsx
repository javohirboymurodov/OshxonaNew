import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  token?: string;
  branchId?: string;
  userId?: string;
  orderId?: string;
}

interface SocketHook {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  onlineAdmins: number;
}

export const useSocket = (options: UseSocketOptions = {}): SocketHook => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlineAdmins] = useState(0);

  useEffect(() => {
    const base = import.meta.env.VITE_SOCKET_URL
      || (import.meta.env.VITE_API_BASE_URL ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/api$/, '') : 'http://localhost:5000');
    const socketUrl = base.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://');
    
    console.log('🔌 Connecting to Socket.IO server:', socketUrl);
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
      setConnected(true);
      setError(null);
      
      // Admin panel uchun branch'ga qo'shilish (branchId bo'lmasa 'default')
      if (options.token) {
        socketInstance.emit('join-admin', {
          token: options.token,
          branchId: options.branchId || 'default'
        });
      }
      
      // User tracking uchun
      if (options.userId) {
        socketInstance.emit('join-user', {
          userId: options.userId,
          orderId: options.orderId
        });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('🔌 Socket.IO connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    // Admin events
    socketInstance.on('joined-admin', (data) => {
      console.log('👨‍💼 Admin joined branch:', data.branchId);
    });

    socketInstance.on('auth-error', (message) => {
      console.error('🔐 Socket.IO auth error:', message);
      setError(message);
    });

    // User events
    socketInstance.on('joined-user', (data) => {
      console.log('👤 User joined for tracking:', data);
    });

    // Re-subscribe on reconnect for reliability
    socketInstance.on('reconnect', () => {
      if (options.token) {
        socketInstance.emit('join-admin', { token: options.token, branchId: options.branchId || 'default' });
      }
      if (options.userId) {
        socketInstance.emit('join-user', { userId: options.userId, orderId: options.orderId });
      }
    });

    // 🔧 YANGI: Kuryer lokatsiyasi real-time yangilanishi
    socketInstance.on('courier:location', (data) => {
      console.log('🚚 Courier location update received:', data);
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      console.log('🧹 Socket.IO cleanup');
      socketInstance.disconnect();
    };
  }, [options.token, options.branchId, options.userId, options.orderId]);

  return {
    socket,
    connected,
    error,
    onlineAdmins
  };
};

// Real-time buyurtmalar hook (Admin uchun)
export const useRealTimeOrders = (token: string, branchId: string) => {
  const { socket, connected } = useSocket({ token, branchId });
  type NewOrderLite = { orderId?: string; id?: string; customer?: { name?: string }; total?: number; sound?: boolean };
  const [newOrders, setNewOrders] = useState<NewOrderLite[]>([]);
  const [orderUpdates, setOrderUpdates] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    // Yangi buyurtma kelganda
    const handleNewOrder = (order: NewOrderLite) => {
      console.log('📦 New order received:', order);
      setNewOrders(prev => [order, ...prev.slice(0, 49)]); // Last 50 orders
      
      // Audio notification (agar browser ruxsat bergan bo'lsa)
      if (order.sound) {
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch((e) => { console.warn('Audio play blocked', e?.message || e); });
        } catch (err) {
          console.warn('Audio init error', (err as Error)?.message || err);
        }
      }
      if (order.sound && 'Notification' in window) {
        const play = async () => {
          try {
            await new Audio('/notification.wav').play();
          } catch {
            try { await new Audio('/notification.mp3').play(); } catch (e) { console.error(e); }
          }
        };
        play();
        
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification(`Yangi buyurtma №${order.orderId || ''}`.trim(), {
            body: `${order.customer?.name || 'Mijoz'} - ${(order.total || 0).toLocaleString()} so'm`,
            icon: '/favicon.ico',
            tag: `order-${order.id}`
          });
        }
      }
    };

    // Buyurtma yangilanishi
    const handleOrderUpdate = (update: Record<string, unknown>) => {
      console.log('🔄 Order update received:', update);
      setOrderUpdates(prev => [update, ...prev.slice(0, 99)]);
    };

    // 🔧 FIX: Kuryer buyurtma holati yangilanishi
    const handleOrderStatusUpdate = (update: Record<string, unknown>) => {
      console.log('🚚 Order status update received:', update);
      setOrderUpdates(prev => [update, ...prev.slice(0, 99)]);
      
      // Audio notification kuryer holati o'zgarganda
      try {
        const audio = new Audio('/notification.wav');
        audio.play().catch((e) => { console.warn('Audio play blocked', e?.message || e); });
      } catch (err) {
        console.warn('Audio init error', (err as Error)?.message || err);
      }
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const statusText = {
          'assigned': 'Kuryer tayinlandi',
          'on_delivery': 'Buyurtma qabul qilindi',
          'delivered': 'Buyurtma yetkazildi'
        }[update.status as string] || 'Holat o\'zgardi';
        
        new Notification(`Buyurtma holati: ${statusText}`, {
          body: `№${update.orderId || ''} - ${update.courierName || 'Kuryer'}`,
          icon: '/favicon.ico',
          tag: `order-status-${update.orderId}`
        });
      }
    };

    // Mijoz kelgani haqida xabar
    const handleCustomerArrived = (data: Record<string, unknown>) => {
      console.log('🚶 Customer arrived notification:', data);
      
      // Audio notification
      if (data.sound) {
        try {
          const audio = new Audio('/notification.wav');
          audio.play().catch((e) => { console.warn('Audio play blocked', e?.message || e); });
        } catch (err) {
          console.warn('Audio init error', (err as Error)?.message || err);
        }
      }
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Mijoz keldi! Stol: ${data.tableNumber || 'N/A'}`, {
          body: `Buyurtma №${data.orderId || ''} - ${(data.total || 0).toLocaleString()} so'm`,
          icon: '/favicon.ico',
          tag: `customer-arrived-${data.orderId}`
        });
      }
      
      // Order updates ga ham qo'shamiz
      setOrderUpdates(prev => [data, ...prev.slice(0, 99)]);
    };

    socket.on('new-order', handleNewOrder);
    socket.on('order-updated', handleOrderUpdate);
    socket.on('order-status-updated', handleOrderStatusUpdate);
    socket.on('customer-arrived', handleCustomerArrived);

    return () => {
      socket.off('new-order', handleNewOrder);
      socket.off('order-updated', handleOrderUpdate);
      socket.off('order-status-updated', handleOrderStatusUpdate);
      socket.off('customer-arrived', handleCustomerArrived);
    };
  }, [socket, connected]);

  // Buyurtma holatini o'zgartirish
  const updateOrderStatus = (orderId: string, status: string, message?: string) => {
    if (socket && connected) {
      socket.emit('update-order-status', {
        orderId,
        status,
        message
      });
    }
  };

  return {
    newOrders,
    orderUpdates,
    updateOrderStatus,
    connected
  };
};

// User buyurtma kuzatuvi hook
export const useOrderTracking = (orderId: string, userId?: string) => {
  const { socket, connected } = useSocket({ userId, orderId });
  const [orderStatus, setOrderStatus] = useState<Record<string, unknown> | null>(null);
  const [statusHistory, setStatusHistory] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!socket || !connected || !orderId) return;

    // Buyurtma kuzatuvini boshlash
    socket.emit('track-order', orderId);

    // Status yangilanishlarini tinglash
    const handleStatusUpdate = (update: Record<string, unknown>) => {
      console.log('📊 Order status update:', update);
      setOrderStatus(update);
      setStatusHistory(prev => [update, ...prev]);
    };

    const handleOrderStatusUpdate = (update: { orderId?: string }) => {
      console.log('📋 Order updated:', update);
      if (update.orderId === orderId) {
        setOrderStatus(update);
      }
    };

    socket.on('status-updated', handleStatusUpdate);
    socket.on('order-status-updated', handleOrderStatusUpdate);

    return () => {
      socket.off('status-updated', handleStatusUpdate);
      socket.off('order-status-updated', handleOrderStatusUpdate);
    };
  }, [socket, connected, orderId]);

  return {
    orderStatus,
    statusHistory,
    connected
  };
};

export default useSocket;
