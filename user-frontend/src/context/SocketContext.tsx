import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Order, OrderStatus, SocketEvents } from '@/types';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinUserRoom: (userId: string) => void;
  trackOrder: (orderId: string) => void;
  onOrderUpdate: (callback: (order: Order) => void) => void;
  onStatusUpdate: (callback: (data: SocketEvents['order-status-update']) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
      
      const socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket.IO connected:', socketInstance.id);
        setConnected(true);
        
        // Auto join user room
        if (user._id) {
          socketInstance.emit('join-user', { userId: user._id });
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Socket.IO disconnected');
        setConnected(false);
      });

      socketInstance.on('error', (error) => {
        console.error('❌ Socket.IO error:', error);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [user]);

  const joinUserRoom = (userId: string) => {
    if (socket && connected) {
      socket.emit('join-user', { userId });
    }
  };

  const trackOrder = (orderId: string) => {
    if (socket && connected) {
      socket.emit('track-order', orderId);
    }
  };

  const onOrderUpdate = (callback: (order: Order) => void) => {
    if (socket) {
      socket.on('order-updated', callback);
      return () => socket.off('order-updated', callback);
    }
  };

  const onStatusUpdate = (callback: (data: SocketEvents['order-status-update']) => void) => {
    if (socket) {
      socket.on('order-status-update', callback);
      return () => socket.off('order-status-update', callback);
    }
  };

  const value: SocketContextType = {
    socket,
    connected,
    joinUserRoom,
    trackOrder,
    onOrderUpdate,
    onStatusUpdate,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
