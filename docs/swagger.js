// Swagger API Documentation Configuration
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger/OpenAPI 3.0 Configuration
 * API dokumentatsiyasi uchun
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Oshxona API',
      version: '1.0.0',
      description: `
🍕 **Oshxona - Restaurant Management System API**

Bu API restaurant boshqaruv tizimi uchun yaratilgan bo'lib, quyidagi funksiyalarni taqdim etadi:

### 🎯 **Asosiy Funksiyalar:**
- 👥 **User Management** - Foydalanuvchilar boshqaruvi
- 🛒 **Order Management** - Buyurtmalar tizimi  
- 🍽️ **Product Management** - Mahsulotlar katalogi
- 📂 **Category Management** - Kategoriyalar
- 🏢 **Branch Management** - Filiallar boshqaruvi
- 📊 **Dashboard & Analytics** - Statistika va hisobotlar
- 🚚 **Courier Management** - Kuryer tizimi

### 🔐 **Authentication:**
API JWT (Bearer) token orqali himoyalangan. Har bir so'rov uchun Authorization header talab qilinadi.

### 📱 **Integration:**
Bu API Telegram bot va React admin panel bilan integratsiyalashgan.

### 🌐 **Base URL:**
- Development: \`http://localhost:5000/api\`
- Production: \`https://your-domain.com/api\`
      `,
      contact: {
        name: 'Oshxona Development Team',
        email: 'support@oshxona.uz'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.oshxona.uz/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token uchun Authorization header. Format: `Bearer <token>`'
        }
      },
      schemas: {
        // User Schemas
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a1' },
            telegramId: { type: 'number', example: 123456789 },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            username: { type: 'string', example: 'johndoe' },
            phone: { type: 'string', example: '+998901234567' },
            role: { 
              type: 'string', 
              enum: ['user', 'admin', 'courier', 'superadmin'],
              example: 'user'
            },
            isActive: { type: 'boolean', example: true },
            registrationDate: { type: 'string', format: 'date-time' },
            lastActivity: { type: 'string', format: 'date-time' }
          }
        },
        
        // Product Schemas
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a2' },
            name: { type: 'string', example: 'Pepperoni Pizza' },
            description: { type: 'string', example: 'Delicious pizza with pepperoni and cheese' },
            price: { type: 'number', example: 45000 },
            category: { 
              type: 'string', 
              example: '60d5f484f1d2c6b1f8c8e8a3',
              description: 'Category ID'
            },
            image: {
              type: 'object',
              properties: {
                url: { type: 'string', example: '/uploads/pizza.jpg' },
                publicId: { type: 'string', example: 'oshxona/pizza_123' }
              }
            },
            isActive: { type: 'boolean', example: true },
            isVisible: { type: 'boolean', example: true },
            sortOrder: { type: 'number', example: 1 },
            nutritionalInfo: {
              type: 'object',
              properties: {
                calories: { type: 'number', example: 250 },
                protein: { type: 'number', example: 12 },
                carbs: { type: 'number', example: 30 },
                fat: { type: 'number', example: 10 }
              }
            }
          }
        },

        // Category Schema
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a3' },
            name: { type: 'string', example: 'Pizzalar' },
            description: { type: 'string', example: 'Turli xil pizza turlari' },
            icon: { type: 'string', example: '🍕' },
            isActive: { type: 'boolean', example: true },
            isVisible: { type: 'boolean', example: true },
            sortOrder: { type: 'number', example: 1 }
          }
        },

        // Order Schema
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a4' },
            orderId: { type: 'string', example: 'ORD-20240115-001' },
            user: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a1' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a2' },
                  quantity: { type: 'number', example: 2 },
                  price: { type: 'number', example: 45000 }
                }
              }
            },
            total: { type: 'number', example: 90000 },
            status: {
              type: 'string',
              enum: ['new', 'confirmed', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'],
              example: 'new'
            },
            orderType: {
              type: 'string',
              enum: ['delivery', 'pickup', 'dine_in'],
              example: 'delivery'
            },
            paymentMethod: {
              type: 'string',
              enum: ['cash', 'card', 'click', 'payme'],
              example: 'cash'
            },
            branch: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a5' },
            deliveryInfo: {
              type: 'object',
              properties: {
                address: { type: 'string', example: 'Toshkent, Yunusobod tumani, 10-uy' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', example: 41.3111 },
                    longitude: { type: 'number', example: 69.2401 }
                  }
                },
                phone: { type: 'string', example: '+998901234567' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Branch Schema
        Branch: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d5f484f1d2c6b1f8c8e8a5' },
            name: { type: 'string', example: 'Oshxona Yunusobod' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', example: 'Amir Temur ko\'chasi 107' },
                district: { type: 'string', example: 'Yunusobod tumani' },
                city: { type: 'string', example: 'Toshkent' },
                formatted: { type: 'string', example: 'Toshkent, Yunusobod tumani, Amir Temur ko\'chasi 107' },
                coordinates: {
                  type: 'object',
                  properties: {
                    latitude: { type: 'number', example: 41.3111 },
                    longitude: { type: 'number', example: 69.2401 }
                  }
                }
              }
            },
            phone: { type: 'string', example: '+998712000000' },
            isActive: { type: 'boolean', example: true },
            workingHours: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  isOpen: { type: 'boolean', example: true },
                  open: { type: 'string', example: '10:00' },
                  close: { type: 'string', example: '22:00' }
                }
              }
            }
          }
        },

        // Error Response Schema
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Ma\'lumot topilmadi' },
            code: { type: 'string', example: 'NOT_FOUND' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },

        // Success Response Schema
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string', example: 'Muvaffaqiyatli bajarildi' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: '🔐 Authentication va authorization'
      },
      {
        name: 'Users',
        description: '👥 Foydalanuvchilar boshqaruvi'
      },
      {
        name: 'Products',
        description: '🍽️ Mahsulotlar boshqaruvi'
      },
      {
        name: 'Categories',
        description: '📂 Kategoriyalar boshqaruvi'
      },
      {
        name: 'Orders',
        description: '🛒 Buyurtmalar boshqaruvi'
      },
      {
        name: 'Branches',
        description: '🏢 Filiallar boshqaruvi'
      },
      {
        name: 'Dashboard',
        description: '📊 Dashboard va statistika'
      },
      {
        name: 'Couriers',
        description: '🚚 Kuryer boshqaruvi'
      }
    ]
  },
  apis: [
    './api/routes/*.js',
    './api/controllers/*.js',
    './docs/api-examples.js'
  ]
};

const specs = swaggerJsdoc(swaggerOptions);

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};
