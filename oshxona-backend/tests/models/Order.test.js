// tests/models/Order.test.js
const Order = require('../../models/Order');
const User = require('../../models/User');
const Branch = require('../../models/Branch');
const Product = require('../../models/Product');

describe('Order Model', () => {
  let user, branch, product;

  beforeEach(async () => {
    user = await createTestUser();
    branch = await createTestBranch();
    product = await createTestProduct();
  });

  describe('Order Creation', () => {
    test('should create order with valid data', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'delivery',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 2,
          price: product.price,
          totalPrice: product.price * 2
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: product.price * 2,
        total: product.price * 2,
        paymentMethod: 'cash'
      };

      const order = await Order.create(orderData);
      
      expect(order.orderType).toBe('delivery');
      expect(order.status).toBe('pending');
      expect(order.paymentStatus).toBe('pending');
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);
      expect(order.orderId).toBeDefined();
      expect(order.orderId).toMatch(/^ORD/);
    });

    test('should auto-generate orderId', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'pickup',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'card'
      };

      const order = await Order.create(orderData);
      
      expect(order.orderId).toBeDefined();
      expect(order.orderId).toMatch(/^ORD\d+[A-Z0-9]{5}$/);
    });

    test('should require user, orderType, items, and customerInfo', async () => {
      const incompleteOrder = {
        branch: branch._id,
        subtotal: 10000,
        total: 10000,
        paymentMethod: 'cash'
      };

      await expect(Order.create(incompleteOrder)).rejects.toThrow();
    });
  });

  describe('Order Types', () => {
    test('should validate orderType enum', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'invalid_type',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'cash'
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    test('should create delivery order with delivery info', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'delivery',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        deliveryInfo: {
          address: 'Test Address',
          location: {
            latitude: 41.2995,
            longitude: 69.2401
          },
          instructions: 'Ring the bell'
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'cash'
      };

      const order = await Order.create(orderData);
      
      expect(order.orderType).toBe('delivery');
      expect(order.deliveryInfo.address).toBe('Test Address');
      expect(order.deliveryInfo.location.latitude).toBe(41.2995);
      expect(order.deliveryInfo.instructions).toBe('Ring the bell');
    });

    test('should create dine-in order with table info', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'dine_in',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        dineInInfo: {
          tableNumber: '5',
          arrivalTime: '19:00',
          guestCount: 4
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'card'
      };

      const order = await Order.create(orderData);
      
      expect(order.orderType).toBe('dine_in');
      expect(order.dineInInfo.tableNumber).toBe('5');
      expect(order.dineInInfo.guestCount).toBe(4);
    });
  });

  describe('Order Status', () => {
    test('should validate status enum', async () => {
      const order = await Order.create({
        user: user._id,
        branch: branch._id,
        orderType: 'pickup',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'cash'
      });

      // Valid status updates
      const validStatuses = ['confirmed', 'preparing', 'ready', 'completed'];
      for (const status of validStatuses) {
        order.status = status;
        await expect(order.save()).resolves.toBeDefined();
      }

      // Invalid status
      order.status = 'invalid_status';
      await expect(order.save()).rejects.toThrow();
    });

    test('should track status history', async () => {
      const order = await Order.create({
        user: user._id,
        branch: branch._id,
        orderType: 'delivery',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'cash',
        statusHistory: [{
          status: 'pending',
          note: 'Order created',
          updatedBy: 'system'
        }]
      });

      expect(order.statusHistory).toHaveLength(1);
      expect(order.statusHistory[0].status).toBe('pending');
      expect(order.statusHistory[0].note).toBe('Order created');
    });
  });

  describe('Order Items', () => {
    test('should validate order items structure', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'pickup',
        items: [{
          // Missing required fields
          quantity: 1
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'cash'
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    test('should calculate correct totals', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'delivery',
        items: [
          {
            product: product._id,
            productName: product.name,
            quantity: 2,
            price: product.price,
            totalPrice: product.price * 2
          },
          {
            product: product._id,
            productName: 'Another Product',
            quantity: 1,
            price: 15000,
            totalPrice: 15000
          }
        ],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: (product.price * 2) + 15000,
        deliveryFee: 5000,
        total: (product.price * 2) + 15000 + 5000,
        paymentMethod: 'card'
      };

      const order = await Order.create(orderData);
      
      expect(order.items).toHaveLength(2);
      expect(order.subtotal).toBe((product.price * 2) + 15000);
      expect(order.deliveryFee).toBe(5000);
      expect(order.total).toBe((product.price * 2) + 15000 + 5000);
    });
  });

  describe('Payment Methods', () => {
    test('should validate payment method enum', async () => {
      const orderData = {
        user: user._id,
        branch: branch._id,
        orderType: 'pickup',
        items: [{
          product: product._id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }],
        customerInfo: {
          name: user.firstName,
          phone: user.phone
        },
        subtotal: product.price,
        total: product.price,
        paymentMethod: 'bitcoin' // Invalid payment method
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    test('should accept valid payment methods', async () => {
      const validMethods = ['cash', 'card', 'click', 'payme', 'uzcard', 'humo'];
      
      for (const method of validMethods) {
        const orderData = {
          user: user._id,
          branch: branch._id,
          orderType: 'pickup',
          items: [{
            product: product._id,
            productName: product.name,
            quantity: 1,
            price: product.price,
            totalPrice: product.price
          }],
          customerInfo: {
            name: user.firstName,
            phone: user.phone
          },
          subtotal: product.price,
          total: product.price,
          paymentMethod: method
        };

        const order = await Order.create(orderData);
        expect(order.paymentMethod).toBe(method);
      }
    });
  });
});