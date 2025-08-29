// tests/models/User.test.js
const User = require('../../models/User');

describe('User Model', () => {
  describe('User Creation', () => {
    test('should create user with valid data', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'user'
      };

      const user = await User.create(userData);
      
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.telegramId).toBe(userData.telegramId);
      expect(user.phone).toBe(userData.phone);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
      expect(user.isBlocked).toBe(false);
    });

    test('should require firstName', async () => {
      const userData = {
        telegramId: 123456789,
        phone: '+998901234567'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    test('should set default role as user', async () => {
      const userData = {
        firstName: 'John',
        telegramId: 123456789,
        phone: '+998901234567'
      };

      const user = await User.create(userData);
      expect(user.role).toBe('user');
    });

    test('should require password for admin/superadmin', async () => {
      const adminData = {
        firstName: 'Admin',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'admin'
      };

      await expect(User.create(adminData)).rejects.toThrow();
    });

    test('should create admin with password', async () => {
      const adminData = {
        firstName: 'Admin',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'admin',
        password: 'admin123',
        branch: require('mongoose').Types.ObjectId()
      };

      const admin = await User.create(adminData);
      expect(admin.role).toBe('admin');
      expect(admin.password).toBeDefined();
      expect(admin.password).not.toBe('admin123'); // Should be hashed
    });
  });

  describe('User Methods', () => {
    test('should compare password correctly', async () => {
      const adminData = {
        firstName: 'Admin',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'admin',
        password: 'admin123',
        branch: require('mongoose').Types.ObjectId()
      };

      const admin = await User.create(adminData);
      
      const isValidPassword = await admin.comparePassword('admin123');
      const isInvalidPassword = await admin.comparePassword('wrongpassword');
      
      expect(isValidPassword).toBe(true);
      expect(isInvalidPassword).toBe(false);
    });

    test('should return false for user without password', async () => {
      const user = await createTestUser();
      const isValidPassword = await user.comparePassword('anypassword');
      expect(isValidPassword).toBe(false);
    });
  });

  describe('Courier Specific Fields', () => {
    test('should create courier with courierInfo', async () => {
      const courierData = {
        firstName: 'Courier',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'courier',
        courierInfo: {
          vehicleType: 'bike',
          isOnline: true,
          isAvailable: true,
          rating: 4.5
        }
      };

      const courier = await User.create(courierData);
      
      expect(courier.role).toBe('courier');
      expect(courier.courierInfo.vehicleType).toBe('bike');
      expect(courier.courierInfo.isOnline).toBe(true);
      expect(courier.courierInfo.isAvailable).toBe(true);
      expect(courier.courierInfo.rating).toBe(4.5);
      expect(courier.courierInfo.totalDeliveries).toBe(0);
    });

    test('should require vehicleType for courier', async () => {
      const courierData = {
        firstName: 'Courier',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'courier'
      };

      await expect(User.create(courierData)).rejects.toThrow();
    });
  });

  describe('User Validation', () => {
    test('should validate role enum', async () => {
      const userData = {
        firstName: 'John',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'invalid_role'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    test('should validate language enum', async () => {
      const userData = {
        firstName: 'John',
        telegramId: 123456789,
        phone: '+998901234567',
        language: 'invalid_lang'
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    test('should validate vehicleType enum for courier', async () => {
      const courierData = {
        firstName: 'Courier',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'courier',
        courierInfo: {
          vehicleType: 'invalid_vehicle'
        }
      };

      await expect(User.create(courierData)).rejects.toThrow();
    });
  });
});