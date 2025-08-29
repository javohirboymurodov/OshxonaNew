// BaseHandler Tests
const BaseHandler = require('../../utils/BaseHandler');

describe('BaseHandler', () => {
  describe('isAdmin', () => {
    test('should return true for admin user', () => {
      const ctx = {
        from: { id: 123456789 },
        session: { user: { role: 'admin' } }
      };
      expect(BaseHandler.isAdmin(ctx)).toBe(true);
    });

    test('should return true for superadmin user', () => {
      const ctx = {
        from: { id: 123456789 },
        session: { user: { role: 'superadmin' } }
      };
      expect(BaseHandler.isAdmin(ctx)).toBe(true);
    });

    test('should return false for regular user', () => {
      const ctx = {
        from: { id: 123456789 },
        session: { user: { role: 'user' } }
      };
      expect(BaseHandler.isAdmin(ctx)).toBe(false);
    });

    test('should return false for undefined session', () => {
      const ctx = { from: { id: 123456789 } };
      expect(BaseHandler.isAdmin(ctx)).toBe(false);
    });
  });

  describe('isSuperAdmin', () => {
    test('should return true for superadmin user', () => {
      const ctx = {
        from: { id: 123456789 },
        session: { user: { role: 'superadmin' } }
      };
      expect(BaseHandler.isSuperAdmin(ctx)).toBe(true);
    });

    test('should return false for admin user', () => {
      const ctx = {
        from: { id: 123456789 },
        session: { user: { role: 'admin' } }
      };
      expect(BaseHandler.isSuperAdmin(ctx)).toBe(false);
    });
  });

  describe('getUserRole', () => {
    test('should return correct user role', () => {
      const ctx = {
        from: { id: 123456789 },
        session: { user: { role: 'admin' } }
      };
      expect(BaseHandler.getUserRole(ctx)).toBe('admin');
    });

    test('should return "user" for undefined session', () => {
      const ctx = { from: { id: 123456789 } };
      expect(BaseHandler.getUserRole(ctx)).toBe('user');
    });
  });

  describe('sendErrorMessage', () => {
    test('should send error message', async () => {
      const ctx = testUtils.createMockCtx();
      const error = new Error('Test error');

      await BaseHandler.sendErrorMessage(ctx, error, 'Custom error message');

      expect(ctx.reply).toHaveBeenCalledWith('Custom error message');
    });

    test('should use default error message', async () => {
      const ctx = testUtils.createMockCtx();
      const error = new Error('Test error');

      await BaseHandler.sendErrorMessage(ctx, error);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Xatolik yuz berdi!');
    });
  });

  describe('sendSuccessMessage', () => {
    test('should send success message', async () => {
      const ctx = testUtils.createMockCtx();

      await BaseHandler.sendSuccessMessage(ctx, 'Operation successful');

      expect(ctx.reply).toHaveBeenCalledWith('✅ Operation successful');
    });
  });

  describe('formatMessage', () => {
    test('should format message with provided data', () => {
      const template = 'Hello {name}, you have {count} messages';
      const data = { name: 'John', count: 5 };

      const result = BaseHandler.formatMessage(template, data);
      expect(result).toBe('Hello John, you have 5 messages');
    });

    test('should handle missing data gracefully', () => {
      const template = 'Hello {name}, you have {count} messages';
      const data = { name: 'John' };

      const result = BaseHandler.formatMessage(template, data);
      expect(result).toBe('Hello John, you have {count} messages');
    });
  });

  describe('getPagination', () => {
    test('should generate correct pagination', () => {
      const result = BaseHandler.getPagination(50, 10, 2);
      
      expect(result).toEqual({
        currentPage: 2,
        totalPages: 5,
        limit: 10,
        total: 50,
        hasNext: true,
        hasPrev: true,
        skip: 10
      });
    });

    test('should handle first page correctly', () => {
      const result = BaseHandler.getPagination(50, 10, 1);
      
      expect(result.hasPrev).toBe(false);
      expect(result.hasNext).toBe(true);
      expect(result.skip).toBe(0);
    });

    test('should handle last page correctly', () => {
      const result = BaseHandler.getPagination(50, 10, 5);
      
      expect(result.hasPrev).toBe(true);
      expect(result.hasNext).toBe(false);
    });
  });

  describe('extractIdFromCallback', () => {
    test('should extract ID from callback data', () => {
      const callbackData = 'product_details_507f1f77bcf86cd799439011';
      const result = BaseHandler.extractIdFromCallback(callbackData);
      
      expect(result).toBe('507f1f77bcf86cd799439011');
    });

    test('should return null for invalid callback data', () => {
      const callbackData = 'invalid_callback_data';
      const result = BaseHandler.extractIdFromCallback(callbackData);
      
      expect(result).toBeNull();
    });
  });

  describe('isValidObjectId', () => {
    test('should validate correct ObjectId', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(BaseHandler.isValidObjectId(validId)).toBe(true);
    });

    test('should reject invalid ObjectId', () => {
      const invalidIds = ['123', 'invalid', '', null, undefined];
      
      invalidIds.forEach(id => {
        expect(BaseHandler.isValidObjectId(id)).toBe(false);
      });
    });
  });

  describe('timeAgo', () => {
    test('should format recent time correctly', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const result = BaseHandler.timeAgo(fiveMinutesAgo);
      expect(result).toContain('daqiqa oldin');
    });

    test('should handle invalid date', () => {
      const result = BaseHandler.timeAgo('invalid date');
      expect(result).toBe('Noma\'lum vaqt');
    });
  });

  describe('formatFileSize', () => {
    test('should format file sizes correctly', () => {
      expect(BaseHandler.formatFileSize(1024)).toBe('1.00 KB');
      expect(BaseHandler.formatFileSize(1048576)).toBe('1.00 MB');
      expect(BaseHandler.formatFileSize(1073741824)).toBe('1.00 GB');
    });

    test('should handle zero and negative sizes', () => {
      expect(BaseHandler.formatFileSize(0)).toBe('0 B');
      expect(BaseHandler.formatFileSize(-100)).toBe('0 B');
    });
  });

  describe('safeJsonParse', () => {
    test('should parse valid JSON', () => {
      const jsonString = '{"name": "test", "value": 123}';
      const result = BaseHandler.safeJsonParse(jsonString);
      
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    test('should return default value for invalid JSON', () => {
      const invalidJson = 'invalid json';
      const defaultValue = { error: true };
      const result = BaseHandler.safeJsonParse(invalidJson, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });
  });

  describe('safeExecute', () => {
    test('should execute function successfully', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      const ctx = testUtils.createMockCtx();

      const result = await BaseHandler.safeExecute(mockFunction, ctx);

      expect(mockFunction).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    test('should handle function errors gracefully', async () => {
      const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      const ctx = testUtils.createMockCtx();

      await BaseHandler.safeExecute(mockFunction, ctx, 'Custom error');

      expect(ctx.reply).toHaveBeenCalledWith('Custom error');
    });

    test('should handle synchronous function errors', async () => {
      const mockFunction = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const ctx = testUtils.createMockCtx();

      await BaseHandler.safeExecute(mockFunction, ctx);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Xatolik yuz berdi!');
    });
  });
});
