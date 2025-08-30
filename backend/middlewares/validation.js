// middleware/validation.js
const Joi = require('joi');
const { ValidationError } = require('../utils/errorHandler');

// Common validation schemas
const schemas = {
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  phone: Joi.string().pattern(/^\+998[0-9]{9}$/),
  email: Joi.string().email(),
  password: Joi.string().min(6).max(128),
  name: Joi.string().min(2).max(100).trim(),
  
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  // Order status
  orderStatus: Joi.string().valid(
    'pending', 'confirmed', 'preparing', 'ready', 
    'assigned', 'picked_up', 'on_delivery', 'delivered', 
    'completed', 'cancelled', 'refunded', 'customer_arrived'
  ),
  
  // Order type
  orderType: Joi.string().valid('delivery', 'pickup', 'dine_in', 'table'),
  
  // Payment method
  paymentMethod: Joi.string().valid('cash', 'card', 'click', 'payme', 'uzcard', 'humo'),
  
  // User role
  userRole: Joi.string().valid('user', 'admin', 'superadmin', 'courier')
};

// Validation schemas for different endpoints
const validationSchemas = {
  // Auth validations
  login: Joi.object({
    phone: schemas.phone.required(),
    password: schemas.password.required()
  }),
  
  register: Joi.object({
    firstName: schemas.name.required(),
    lastName: schemas.name,
    phone: schemas.phone.required(),
    email: schemas.email,
    password: schemas.password.required(),
    role: schemas.userRole.default('user'),
    branch: schemas.objectId.when('role', {
      is: Joi.valid('admin', 'courier'),
      then: Joi.required()
    })
  }),
  
  // Order validations
  createOrder: Joi.object({
    orderType: schemas.orderType.required(),
    branch: schemas.objectId.required(),
    items: Joi.array().items(
      Joi.object({
        product: schemas.objectId.required(),
        quantity: Joi.number().integer().min(1).max(50).required(),
        specialInstructions: Joi.string().max(500)
      })
    ).min(1).required(),
    customerInfo: Joi.object({
      name: schemas.name.required(),
      phone: schemas.phone.required(),
      email: schemas.email
    }).required(),
    deliveryInfo: Joi.object({
      address: Joi.string().max(500),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180)
      }),
      instructions: Joi.string().max(500)
    }).when('orderType', {
      is: 'delivery',
      then: Joi.required()
    }),
    dineInInfo: Joi.object({
      tableNumber: Joi.string().max(10),
      arrivalTime: Joi.string(),
      guestCount: Joi.number().integer().min(1).max(20)
    }).when('orderType', {
      is: Joi.valid('dine_in', 'table'),
      then: Joi.required()
    }),
    paymentMethod: schemas.paymentMethod.required(),
    notes: Joi.string().max(1000)
  }),
  
  updateOrderStatus: Joi.object({
    status: schemas.orderStatus.required(),
    note: Joi.string().max(500)
  }),
  
  assignCourier: Joi.object({
    courierId: schemas.objectId.required(),
    estimatedTime: Joi.date().min('now')
  }),
  
  // Product validations
  createProduct: Joi.object({
    name: schemas.name.required(),
    nameRu: schemas.name,
    nameEn: schemas.name,
    categoryId: schemas.objectId.required(),
    description: Joi.string().max(1000),
    descriptionRu: Joi.string().max(1000),
    descriptionEn: Joi.string().max(1000),
    price: Joi.number().min(0).max(10000000).required(),
    preparationTime: Joi.number().integer().min(1).max(180).default(15),
    ingredients: Joi.array().items(Joi.string().max(100)),
    allergens: Joi.array().items(Joi.string().max(100)),
    tags: Joi.array().items(Joi.string().max(50)),
    isPopular: Joi.boolean().default(false),
    isFeatured: Joi.boolean().default(false)
  }),
  
  updateProduct: Joi.object({
    name: schemas.name,
    nameRu: schemas.name,
    nameEn: schemas.name,
    categoryId: schemas.objectId,
    description: Joi.string().max(1000),
    price: Joi.number().min(0).max(10000000),
    preparationTime: Joi.number().integer().min(1).max(180),
    isActive: Joi.boolean(),
    isPopular: Joi.boolean(),
    isFeatured: Joi.boolean()
  }),
  
  // Promo validations
  createPromo: Joi.object({
    discountType: Joi.string().valid('percent', 'amount').required(),
    discountValue: Joi.number().min(0).required(),
    promoStart: Joi.date().min('now').required(),
    promoEnd: Joi.date().greater(Joi.ref('promoStart')).required()
  }),
  
  // Category validations
  createCategory: Joi.object({
    name: schemas.name.required(),
    nameRu: schemas.name,
    nameEn: schemas.name,
    description: Joi.string().max(500),
    sortOrder: Joi.number().integer().min(0).default(0)
  }),
  
  // Branch validations
  createBranch: Joi.object({
    name: schemas.name.required(),
    address: Joi.string().max(500).required(),
    phone: schemas.phone.required(),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }),
    workingHours: Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    })
  }),
  
  // User validations
  updateProfile: Joi.object({
    firstName: schemas.name,
    lastName: schemas.name,
    email: schemas.email,
    language: Joi.string().valid('uz', 'ru', 'en')
  }),
  
  // Query validations
  getOrders: Joi.object({
    page: schemas.page,
    limit: schemas.limit,
    status: schemas.orderStatus,
    orderType: schemas.orderType,
    startDate: Joi.date(),
    endDate: Joi.date().min(Joi.ref('startDate')),
    search: Joi.string().max(100)
  }),
  
  getProducts: Joi.object({
    page: schemas.page,
    limit: schemas.limit,
    category: schemas.objectId,
    search: Joi.string().max(100),
    isActive: Joi.boolean(),
    isPopular: Joi.boolean(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(Joi.ref('minPrice'))
  })
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                  source === 'params' ? req.params : req.body;
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      throw new ValidationError(message);
    }
    
    // Replace original data with validated/converted data
    if (source === 'query') req.query = value;
    else if (source === 'params') req.params = value;
    else req.body = value;
    
    next();
  };
};

// Common validators
const validators = {
  objectId: validate(Joi.object({ id: schemas.objectId.required() }), 'params'),
  pagination: validate(validationSchemas.getOrders, 'query'),
  
  // Auth
  login: validate(validationSchemas.login),
  register: validate(validationSchemas.register),
  
  // Orders
  createOrder: validate(validationSchemas.createOrder),
  updateOrderStatus: validate(validationSchemas.updateOrderStatus),
  assignCourier: validate(validationSchemas.assignCourier),
  getOrders: validate(validationSchemas.getOrders, 'query'),
  
  // Products
  createProduct: validate(validationSchemas.createProduct),
  updateProduct: validate(validationSchemas.updateProduct),
  getProducts: validate(validationSchemas.getProducts, 'query'),
  
  // Categories
  createCategory: validate(validationSchemas.createCategory),
  
  // Branches
  createBranch: validate(validationSchemas.createBranch),
  
  // Promos
  createPromo: validate(validationSchemas.createPromo),
  
  // User
  updateProfile: validate(validationSchemas.updateProfile)
};

module.exports = {
  validate,
  validators,
  schemas,
  validationSchemas
};