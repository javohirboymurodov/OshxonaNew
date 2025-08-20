// InputValidator Tests
const InputValidator = require('../../utils/InputValidator');

describe('InputValidator', () => {
  describe('validatePhone', () => {
    test('should validate correct Uzbekistan phone numbers', () => {
      const validPhones = [
        '+998901234567',
        '998901234567',
        '901234567',
        '+998712345678'
      ];

      validPhones.forEach(phone => {
        const result = InputValidator.validatePhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.formatted).toMatch(/^\+998\d{8,9}$/);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        '+1234567890',
        'abc123',
        '',
        null,
        undefined
      ];

      invalidPhones.forEach(phone => {
        const result = InputValidator.validatePhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should format phone numbers correctly', () => {
      const testCases = [
        { input: '901234567', expected: '+998901234567' },
        { input: '+998901234567', expected: '+998901234567' },
        { input: '998901234567', expected: '+998998901234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = InputValidator.validatePhone(input);
        if (result.isValid) {
          expect(result.formatted).toBe(expected);
        }
      });
    });
  });

  describe('validateName', () => {
    test('should validate correct names', () => {
      const validNames = [
        'John Doe',
        'Ahmad',
        'Maria-Elena',
        "O'Connor",
        'Ахмад Али',
        'Ўлмас Раҳимов'
      ];

      validNames.forEach(name => {
        const result = InputValidator.validateName(name);
        expect(result.isValid).toBe(true);
        expect(result.formatted).toBeDefined();
      });
    });

    test('should reject invalid names', () => {
      const invalidNames = [
        '',
        'A',
        '123',
        'Name@123',
        'Very long name that exceeds the maximum length limit for names'
      ];

      invalidNames.forEach(name => {
        const result = InputValidator.validateName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should format names correctly', () => {
      const result = InputValidator.validateName('john doe');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('John Doe');
    });
  });

  describe('validatePrice', () => {
    test('should validate correct prices', () => {
      const validPrices = [0, 100, 5000, 999999];

      validPrices.forEach(price => {
        const result = InputValidator.validatePrice(price);
        expect(result.isValid).toBe(true);
        expect(typeof result.formatted).toBe('number');
      });
    });

    test('should reject invalid prices', () => {
      const invalidPrices = [-1, 'abc', null, undefined, 11000000];

      invalidPrices.forEach(price => {
        const result = InputValidator.validatePrice(price);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should round decimal prices', () => {
      const result = InputValidator.validatePrice(49.99);
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe(50);
    });
  });

  describe('validateQuantity', () => {
    test('should validate correct quantities', () => {
      const validQuantities = [1, 5, 10, 50];

      validQuantities.forEach(quantity => {
        const result = InputValidator.validateQuantity(quantity);
        expect(result.isValid).toBe(true);
        expect(result.formatted).toBe(quantity);
      });
    });

    test('should reject invalid quantities', () => {
      const invalidQuantities = [0, -1, 101, 1.5, 'abc', null];

      invalidQuantities.forEach(quantity => {
        const result = InputValidator.validateQuantity(quantity);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateCoordinates', () => {
    test('should validate correct coordinates', () => {
      const validCoords = [
        [41.2995, 69.2401], // Tashkent
        [39.6542, 66.9597], // Samarkand
        [41.5500, 60.6333]  // Nukus
      ];

      validCoords.forEach(([lat, lon]) => {
        const result = InputValidator.validateCoordinates(lat, lon);
        expect(result.isValid).toBe(true);
        expect(result.latitude).toBe(lat);
        expect(result.longitude).toBe(lon);
      });
    });

    test('should reject invalid coordinates', () => {
      const invalidCoords = [
        [91, 0],    // Invalid latitude
        [0, 181],   // Invalid longitude
        ['abc', 0], // Non-numeric
        [null, 0],  // Null values
      ];

      invalidCoords.forEach(([lat, lon]) => {
        const result = InputValidator.validateCoordinates(lat, lon);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should warn for coordinates outside Uzbekistan', () => {
      const result = InputValidator.validateCoordinates(0, 0); // Equator/Prime Meridian
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('O\'zbekiston hududidan tashqarida');
    });
  });

  describe('validateText', () => {
    test('should validate text with default options', () => {
      const result = InputValidator.validateText('Valid text content');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('Valid text content');
    });

    test('should respect custom options', () => {
      const options = { minLength: 5, maxLength: 10 };
      
      const validResult = InputValidator.validateText('Valid', options);
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = InputValidator.validateText('Too long text', options);
      expect(invalidResult.isValid).toBe(false);
    });

    test('should trim whitespace when enabled', () => {
      const result = InputValidator.validateText('  trimmed  ', { trimWhitespace: true });
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('trimmed');
    });
  });

  describe('sanitizeInput', () => {
    test('should sanitize dangerous HTML characters', () => {
      const dangerous = '<script>alert("xss")</script>';
      const sanitized = InputValidator.sanitizeInput(dangerous);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    test('should handle empty or null input', () => {
      expect(InputValidator.sanitizeInput('')).toBe('');
      expect(InputValidator.sanitizeInput(null)).toBe('');
      expect(InputValidator.sanitizeInput(undefined)).toBe('');
    });
  });

  describe('validateMultiple', () => {
    test('should validate multiple inputs at once', () => {
      const inputs = {
        name: 'John Doe',
        phone: '+998901234567',
        price: 50000
      };

      const rules = {
        name: { validator: InputValidator.validateName },
        phone: { validator: InputValidator.validatePhone },
        price: { validator: InputValidator.validatePrice }
      };

      const result = InputValidator.validateMultiple(inputs, rules);
      expect(result.isValid).toBe(true);
      expect(result.hasErrors).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    test('should collect all validation errors', () => {
      const inputs = {
        name: 'A', // Too short
        phone: '123', // Invalid
        price: -1 // Negative
      };

      const rules = {
        name: { validator: InputValidator.validateName },
        phone: { validator: InputValidator.validatePhone },
        price: { validator: InputValidator.validatePrice }
      };

      const result = InputValidator.validateMultiple(inputs, rules);
      expect(result.isValid).toBe(false);
      expect(result.hasErrors).toBe(true);
      expect(result.errors).toHaveLength(3);
    });
  });
});
