const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketManager {
  static io = null;
  static connectedUsers = new Map();
  static connectedAdmins = new Map();
  
  static init(server) {
    const isDev = process.env.NODE_ENV !== 'production';
    this.io = socketIo(server, {
      cors: isDev
        ? {
            origin: (origin, callback) => {
              // Dev: localhostning barcha portlariga ruxsat
              if (!origin || /^http:\/\/localhost(?::\d+)?$/.test(origin)) return callback(null, true);
              return callback(null, true);
            },
            credentials: true,
            methods: ['GET', 'POST']
          }
        : {
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

      
      // Admin panelga qo'shilish
      socket.on('join-admin', (data) => {
        try {

          
          if (!data || !data.token) {
            console.log('❌ No token provided for admin join');
            socket.emit('auth-error', { message: 'Token required for admin access' });
            return;
          }

          const { token, branchId } = data;
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          

          
          if (decoded.role === 'admin' || decoded.role === 'superadmin') {
            const roomName = `branch:${branchId || 'global'}`;
            socket.join(roomName);
            this.connectedAdmins.set(socket.id, {
              userId: decoded.userId || decoded.id,
              branchId: branchId || 'global',
              role: decoded.role
            });
            
            // Log room size after joining
            const room = this.io.sockets.adapter.rooms.get(roomName);

            

            
            socket.emit('joined-admin', { branchId: branchId || 'global', success: true });
          } else {
            console.log('❌ Invalid role for admin access:', decoded.role);
            socket.emit('auth-error', { message: 'Admin role required' });
          }
        } catch (error) {
          console.error('❌ Admin join error:', error.message);
          socket.emit('auth-error', { message: 'Authentication failed: ' + error.message });
        }
      });
      
      // User tracking (foydalanuvchi buyurtma holatini kuzatish)
      socket.on('join-user', (data) => {
        const { userId, orderId } = data;
        
        if (userId) {
          socket.join(`user:${userId}`);
          this.connectedUsers.set(socket.id, { userId });

        }
        
        if (orderId) {
          socket.join(`order:${orderId}`);

        }
        
        socket.emit('joined-user', { userId, orderId });
      });
      
      // Buyurtma holati real-time kuzatuvi
      socket.on('track-order', (orderId) => {
        socket.join(`order:${orderId}`);

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

      });
    });
  }
  
  // Test notification uchun
  static emitTestNotification(branchId = 'default') {
    if (this.io) {
      console.log(`🧪 SENDING TEST NOTIFICATION TO branch:${branchId}`);
      const room = this.io.sockets.adapter.rooms.get(`branch:${branchId}`);
      console.log(`👥 CLIENTS IN ROOM branch:${branchId}:`, room ? room.size : 0);
      
      this.io.to(`branch:${branchId}`).emit('new-order', {
        orderId: 'TEST123',
        orderNumber: 'TEST123',
        customerName: 'Test Customer',
        total: 50000,
        orderType: 'delivery',
        status: 'pending',
        timestamp: new Date(),
        sound: true
      });
      console.log(`📢 Test notification sent to branch:${branchId}`);
    }
  }

  // Yangi buyurtma eventini adminlarga yuborish
  static emitNewOrder(branchId, orderData) {
    if (this.io) {
      const payload = {
        ...orderData,
        timestamp: new Date(),
        sound: true // Admin panelda ovoz signali uchun
      };
      

      this.io.to(`branch:${branchId}`).emit('new-order', payload);
    } else {

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
      const payload = {
        orderId, // Eslatma: updateData ichida ham orderId bo'lsa, bu mongoIdni saqlash uchun oldinga qo'yildi
        ...updateData
      };
      
      // Order xonasiga
      this.io.to(`order:${orderId}`).emit('order-updated', payload);

      // Agar branchId berilgan bo'lsa, shu filialdagi barcha adminlarga ham yuboramiz
      if (updateData && updateData.branchId) {
        this.io.to(`branch:${updateData.branchId}`).emit('order-updated', payload);
        
        // Superadmin overview xonasiga ham yuboramiz
        if (updateData.branchId !== 'default') {
          this.io.to('branch:default').emit('order-updated', payload);
        }
      }
      
      // Agar event 'dine_in_arrived' bo'lsa, maxsus notification yuboramiz
      if (updateData.event === 'dine_in_arrived') {
        const notificationPayload = {
          type: 'customer_arrived',
          orderId: updateData.orderId,
          tableNumber: updateData.tableNumber,
          customer: updateData.customer,
          total: updateData.total,
          items: updateData.items,
          branchId: updateData.branchId,
          timestamp: new Date(),
          sound: true
        };
        
        // Branch adminlarga
        if (updateData.branchId && updateData.branchId !== 'default') {
          this.io.to(`branch:${updateData.branchId}`).emit('customer-arrived', notificationPayload);
        }
        
        // Superadmin overview xonasiga
        this.io.to('branch:default').emit('customer-arrived', notificationPayload);
        
        console.log(`🔔 Customer arrived notification sent for order:${orderId}`);
      }
      
      console.log(`🔄 Order update emitted for order:${orderId}${updateData && updateData.branchId ? ` (branch:${updateData.branchId})` : ''}`);
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

  // Kuryer lokatsiyasini filialdagi barcha adminlarga yuborish
  static emitCourierLocationToBranch(branchId, payload) {
    if (!this.io) return;
    const data = {
      courierId: payload.courierId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      branchId: String(branchId || ''),
      location: payload.location || null,
      isOnline: Boolean(payload.isOnline),
      isAvailable: Boolean(payload.isAvailable),
      isStale: Boolean(payload.isStale),
      updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date()
    };
    this.io.to(`branch:${branchId}`).emit('courier:location', data);
  }
  
  // 🔧 FIX: Kuryer buyurtma holatini filialdagi barcha adminlarga real-time yuborish
  static emitOrderStatusUpdateToBranch(branchId, payload) {
    if (!this.io) return;
    
    const data = {
      orderId: payload.orderId,
      status: payload.status,
      courierId: payload.courierId,
      courierName: payload.courierName,
      courierStatus: payload.courierStatus,
      deliveredAt: payload.deliveredAt,
      updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
      timestamp: new Date()
    };
    
    // Branch adminlarga yuborish
    if (branchId && branchId !== 'global') {
      this.io.to(`branch:${branchId}`).emit('order-status-updated', data);

    }
    
    // Superadmin overview xonasiga ham yuborish
    this.io.to('branch:default').emit('order-status-updated', data);

  }

  
  // Real-time statistika (admin dashboard uchun)
  static emitStatistics(branchId, stats) {
    if (this.io) {
      this.io.to(`branchId:${branchId}`).emit('statistics-update', {
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
