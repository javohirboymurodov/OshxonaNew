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
  const [onlineAdmins, setOnlineAdmins] = useState(0);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    console.log('🔌 Connecting to Socket.IO server:', socketUrl);
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
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
      
      // Admin panel uchun branch'ga qo'shilish
      if (options.token && options.branchId) {
        socketInstance.emit('join-admin', {
          token: options.token,
          branchId: options.branchId
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
  const [newOrders, setNewOrders] = useState<any[]>([]);
  const [orderUpdates, setOrderUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    // Yangi buyurtma kelganda
    const handleNewOrder = (order: any) => {
      console.log('📦 New order received:', order);
      setNewOrders(prev => [order, ...prev.slice(0, 49)]); // Last 50 orders
      
      // Audio notification (agar browser ruxsat bergan bo'lsa)
      if (order.sound && 'Notification' in window) {
        new Audio('/notification.mp3').play().catch(console.error);
        
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification(`Yangi buyurtma №${order.orderId}`, {
            body: `${order.customer.name} - ${order.total.toLocaleString()} so'm`,
            icon: '/favicon.ico',
            tag: `order-${order.id}`
          });
        }
      }
    };

    // Buyurtma yangilanishi
    const handleOrderUpdate = (update: any) => {
      console.log('🔄 Order update received:', update);
      setOrderUpdates(prev => [update, ...prev.slice(0, 99)]);
    };

    socket.on('new-order', handleNewOrder);
    socket.on('order-updated', handleOrderUpdate);

    return () => {
      socket.off('new-order', handleNewOrder);
      socket.off('order-updated', handleOrderUpdate);
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
  const [orderStatus, setOrderStatus] = useState<any>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!socket || !connected || !orderId) return;

    // Buyurtma kuzatuvini boshlash
    socket.emit('track-order', orderId);

    // Status yangilanishlarini tinglash
    const handleStatusUpdate = (update: any) => {
      console.log('📊 Order status update:', update);
      setOrderStatus(update);
      setStatusHistory(prev => [update, ...prev]);
    };

    const handleOrderStatusUpdate = (update: any) => {
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
