// Validation schemas for API endpoints

const validationSchemas = {
  // Auth schemas
  login: {
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', min: 6, max: 100 }
  },

  register: {
    firstName: { required: true, type: 'string', min: 2, max: 50 },
    lastName: { type: 'string', max: 50 },
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', min: 6, max: 100 },
    phone: { required: true, type: 'phone' }
  },

  // User schemas
  updateProfile: {
    firstName: { type: 'string', min: 2, max: 50 },
    lastName: { type: 'string', max: 50 },
    email: { type: 'email' },
    phone: { type: 'phone' }
  },

  // Product schemas
  createProduct: {
    name: { required: true, type: 'string', min: 2, max: 100 },
    description: { type: 'string', max: 500 },
    price: { required: true, type: 'number' },
    categoryId: { required: true, type: 'mongoId' },
    isActive: { type: 'string', enum: ['true', 'false'] },
    isAvailable: { type: 'string', enum: ['true', 'false'] }
  },

  updateProduct: {
    name: { type: 'string', min: 2, max: 100 },
    description: { type: 'string', max: 500 },
    price: { type: 'number' },
    categoryId: { type: 'mongoId' },
    isActive: { type: 'string', enum: ['true', 'false'] },
    isAvailable: { type: 'string', enum: ['true', 'false'] }
  },

  // Category schemas
  createCategory: {
    name: { required: true, type: 'string', min: 2, max: 50 },
    description: { type: 'string', max: 200 },
    emoji: { type: 'string', max: 10 },
    isActive: { type: 'string', enum: ['true', 'false'] }
  },

  updateCategory: {
    name: { type: 'string', min: 2, max: 50 },
    description: { type: 'string', max: 200 },
    emoji: { type: 'string', max: 10 },
    isActive: { type: 'string', enum: ['true', 'false'] }
  },

  // Order schemas
  createOrder: {
    items: { required: true, type: 'string' }, // JSON string
    orderType: { required: true, type: 'string', enum: ['delivery', 'pickup', 'dine_in', 'dine_in_qr'] },
    paymentMethod: { required: true, type: 'string', enum: ['cash', 'card', 'click', 'payme'] },
    deliveryAddress: { type: 'string', max: 200 },
    notes: { type: 'string', max: 300 },
    branchId: { type: 'mongoId' }
  },

  updateOrderStatus: {
    status: { 
      required: true, 
      type: 'string', 
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'on_delivery', 'delivered', 'cancelled'] 
    },
    notes: { type: 'string', max: 300 }
  },

  // Branch schemas
  createBranch: {
    name: { required: true, type: 'string', min: 2, max: 100 },
    address: { required: true, type: 'string', min: 5, max: 200 },
    phone: { required: true, type: 'phone' },
    workingHours: { type: 'string', max: 100 },
    isActive: { type: 'string', enum: ['true', 'false'] }
  },

  updateBranch: {
    name: { type: 'string', min: 2, max: 100 },
    address: { type: 'string', min: 5, max: 200 },
    phone: { type: 'phone' },
    workingHours: { type: 'string', max: 100 },
    isActive: { type: 'string', enum: ['true', 'false'] }
  },

  // Courier schemas
  updateCourierLocation: {
    courierId: { required: true, type: 'mongoId' },
    latitude: { required: true, type: 'number' },
    longitude: { required: true, type: 'number' },
    isOnline: { type: 'string', enum: ['true', 'false'] }
  },

  assignCourier: {
    orderId: { required: true, type: 'mongoId' },
    courierId: { required: true, type: 'mongoId' }
  },

  // Promo schemas
  createPromo: {
    code: { required: true, type: 'string', min: 3, max: 20, pattern: /^[A-Z0-9]+$/ },
    name: { required: true, type: 'string', min: 2, max: 100 },
    description: { type: 'string', max: 300 },
    discountType: { required: true, type: 'string', enum: ['percentage', 'fixed'] },
    discountValue: { required: true, type: 'number' },
    minOrderAmount: { type: 'number' },
    maxDiscountAmount: { type: 'number' },
    expiresAt: { type: 'string' }, // Date string
    isActive: { type: 'string', enum: ['true', 'false'] }
  },

  applyPromo: {
    promoCode: { required: true, type: 'string', min: 3, max: 20 },
    orderAmount: { required: true, type: 'number' }
  },

  // Review schemas
  createReview: {
    orderId: { required: true, type: 'mongoId' },
    rating: { required: true, type: 'number' },
    comment: { type: 'string', max: 500 }
  },

  // Contact schemas
  contactForm: {
    name: { required: true, type: 'string', min: 2, max: 50 },
    email: { type: 'email' },
    phone: { type: 'phone' },
    subject: { required: true, type: 'string', min: 3, max: 100 },
    message: { required: true, type: 'string', min: 10, max: 1000 }
  },

  // Table schemas
  createTable: {
    number: { required: true, type: 'number' },
    branchId: { required: true, type: 'mongoId' },
    capacity: { type: 'number' },
    isActive: { type: 'string', enum: ['true', 'false'] }
  },

  updateTable: {
    number: { type: 'number' },
    capacity: { type: 'number' },
    isActive: { type: 'string', enum: ['true', 'false'] }
  },

  // Common schemas
  pagination: {
    page: { type: 'number' },
    limit: { type: 'number' },
    sort: { type: 'string', max: 50 },
    order: { type: 'string', enum: ['asc', 'desc'] }
  },

  mongoId: {
    id: { required: true, type: 'mongoId' }
  },

  // File upload schemas
  imageUpload: {
    file: { required: true }
  },

  // Search schemas
  search: {
    q: { required: true, type: 'string', min: 1, max: 100 },
    category: { type: 'mongoId' },
    minPrice: { type: 'number' },
    maxPrice: { type: 'number' }
  },

  // Analytics schemas
  analyticsDateRange: {
    startDate: { type: 'string' }, // Date string
    endDate: { type: 'string' }, // Date string
    branchId: { type: 'mongoId' },
    groupBy: { type: 'string', enum: ['day', 'week', 'month'] }
  },

  // Notification schemas
  sendNotification: {
    title: { required: true, type: 'string', min: 3, max: 100 },
    message: { required: true, type: 'string', min: 10, max: 500 },
    type: { type: 'string', enum: ['info', 'warning', 'success', 'error'] },
    userId: { type: 'mongoId' },
    branchId: { type: 'mongoId' }
  }
};

module.exports = validationSchemas;