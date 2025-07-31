const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketManager {
  static io = null;
  static connectedUsers = new Map();
  static connectedAdmins = new Map();
  
  static init(server) {
    this.io = socketIo(server, {
      cors: {
        origin: [
          process.env.ADMIN_PANEL_URL || 'http://localhost:3000',
          process.env.USER_FRONTEND_URL || 'http://localhost:3001'
        ],
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });
    
    this.setupEventHandlers();
    console.log('✅ Socket.IO server initialized');
    return this.io;
  }
  
  static setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);
      
      // Admin panelga qo'shilish
      socket.on('join-admin', (data) => {
        try {
          const { token, branchId } = data;
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          if (decoded.role === 'admin' || decoded.role === 'superadmin') {
            socket.join(`branch:${branchId}`);
            this.connectedAdmins.set(socket.id, {
              userId: decoded.id,
              branchId: branchId,
              role: decoded.role
            });
            
            console.log(`👨‍💼 Admin joined branch:${branchId}`);
            socket.emit('joined-admin', { branchId });
          }
        } catch (error) {
          console.error('Admin join error:', error);
          socket.emit('auth-error', 'Invalid token');
        }
      });
      
      // User tracking (foydalanuvchi buyurtma holatini kuzatish)
      socket.on('join-user', (data) => {
        const { userId, orderId } = data;
        
        if (userId) {
          socket.join(`user:${userId}`);
          this.connectedUsers.set(socket.id, { userId });
          console.log(`👤 User ${userId} joined for tracking`);
        }
        
        if (orderId) {
          socket.join(`order:${orderId}`);
          console.log(`📦 User joined order tracking: ${orderId}`);
        }
        
        socket.emit('joined-user', { userId, orderId });
      });
      
      // Buyurtma holati real-time kuzatuvi
      socket.on('track-order', (orderId) => {
        socket.join(`order:${orderId}`);
        console.log(`📍 Order tracking started: ${orderId}`);
      });
      
      // Admin buyurtma holatini o'zgartirishi
      socket.on('update-order-status', (data) => {
        const adminData = this.connectedAdmins.get(socket.id);
        if (adminData) {
          // Barcha tracking qilayotgan clientlarga yuborish
          this.emitOrderUpdate(data.orderId, {
            status: data.status,
            message: data.message,
            updatedBy: adminData.userId,
            timestamp: new Date()
          });
        }
      });
      
      // Disconnect
      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        this.connectedAdmins.delete(socket.id);
        console.log(`❌ Client disconnected: ${socket.id}`);
      });
    });
  }
  
  // Yangi buyurtma eventini adminlarga yuborish
  static emitNewOrder(branchId, orderData) {
    if (this.io) {
      this.io.to(`branch:${branchId}`).emit('new-order', {
        ...orderData,
        timestamp: new Date(),
        sound: true // Admin panelda ovoz signali uchun
      });
      
      console.log(`📢 New order emitted to branch:${branchId}`);
    }
  }
  
  // Buyurtma holati o'zgarishi
  static emitStatusUpdate(userId, orderData) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('status-updated', {
        ...orderData,
        timestamp: new Date()
      });
      
      // Order ID bo'yicha ham yuborish (web tracking uchun)
      if (orderData.orderId) {
        this.io.to(`order:${orderData.orderId}`).emit('order-status-updated', {
          ...orderData,
          timestamp: new Date()
        });
      }
      
      console.log(`📊 Status update emitted to user:${userId}`);
    }
  }
  
  // Buyurtma yangilanishi (admin tarafidan)
  static emitOrderUpdate(orderId, updateData) {
    if (this.io) {
      this.io.to(`order:${orderId}`).emit('order-updated', {
        orderId,
        ...updateData
      });
      
      console.log(`🔄 Order update emitted for order:${orderId}`);
    }
  }
  
  // Kuryer lokatsiyasi (kelajakda)
  static emitCourierLocation(orderId, location) {
    if (this.io) {
      this.io.to(`order:${orderId}`).emit('courier-location', {
        orderId,
        location,
        timestamp: new Date()
      });
    }
  }
  
  // Real-time statistika (admin dashboard uchun)
  static emitStatistics(branchId, stats) {
    if (this.io) {
      this.io.to(`branch:${branchId}`).emit('statistics-update', {
        ...stats,
        timestamp: new Date()
      });
    }
  }
  
  // Online adminlar soni
  static getOnlineAdmins(branchId) {
    if (!this.io) return 0;
    
    const room = this.io.sockets.adapter.rooms.get(`branch:${branchId}`);
    return room ? room.size : 0;
  }
  
  // Online userlar soni
  static getOnlineUsers() {
    return this.connectedUsers.size;
  }
  
  // Health check
  static isHealthy() {
    return this.io !== null;
  }
}

module.exports = SocketManager;
