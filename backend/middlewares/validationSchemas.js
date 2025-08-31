const Joi = require('joi');

/**
 * Validation Schemas
 * Validatsiya sxemalari
 */

// Base schemas
const baseSchemas = {
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  phone: Joi.string().pattern(/^\+998[0-9]{9}$/),
  email: Joi.string().email(),
  password: Joi.string().min(6).max(128),
  name: Joi.string().min(1).max(100).trim(),
  description: Joi.string().max(1000).allow('').trim(),
  price: Joi.number().min(0).max(10000000),
  quantity: Joi.number().integer().min(1).max(100),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }),
  address: Joi.string().min(5).max(200).trim()
};

// Auth schemas
const login = Joi.object({
  // phone: baseSchemas.phone.required(),
  email: baseSchemas.email.required(),
  password: baseSchemas.password.required()
});

const register = Joi.object({
  firstName: baseSchemas.name.required(),
  lastName: baseSchemas.name.allow(''),
  phone: baseSchemas.phone.required(),
  password: baseSchemas.password.required(),
  role: Joi.string().valid('user', 'admin', 'superadmin', 'courier').default('user')
});

// Product schemas
const createProduct = Joi.object({
  name: baseSchemas.name.required(),
  description: baseSchemas.description,
  price: baseSchemas.price.required(),
  categoryId: baseSchemas.objectId.required(),
  preparationTime: Joi.number().integer().min(1).max(120).default(15),
  isActive: Joi.boolean().default(true),
  isPopular: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  ingredients: Joi.array().items(Joi.string().trim()).default([]),
  allergens: Joi.array().items(Joi.string().trim()).default([]),
  weight: Joi.number().min(0),
  unit: Joi.string().max(20).default('portion'),
  minOrderQuantity: Joi.number().integer().min(1).default(1),
  maxOrderQuantity: Joi.number().integer().min(1).default(50)
});

const updateProduct = createProduct.fork(['name', 'price', 'categoryId'], (schema) => schema.optional());

// Order schemas
const createOrder = Joi.object({
  orderType: Joi.string().valid('delivery', 'pickup', 'dine_in', 'table').required(),
  items: Joi.array().items(Joi.object({
    product: baseSchemas.objectId.required(),
    quantity: baseSchemas.quantity.required(),
    price: baseSchemas.price.required()
  })).min(1).required(),
  totalAmount: baseSchemas.price.required(),
  deliveryInfo: Joi.when('orderType', {
    is: 'delivery',
    then: Joi.object({
      address: baseSchemas.address.required(),
      location: baseSchemas.coordinates.required(),
      instructions: Joi.string().max(200).allow('')
    }).required(),
    otherwise: Joi.optional()
  }),
  dineInInfo: Joi.when('orderType', {
    is: Joi.string().valid('dine_in', 'table'),
    then: Joi.object({
      tableNumber: Joi.string().max(10),
      arrivalTime: Joi.string().max(50)
    }),
    otherwise: Joi.optional()
  }),
  paymentMethod: Joi.string().valid('cash', 'card', 'online', 'terminal').required()
});

const updateOrderStatus = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'assigned', 'preparing', 'ready', 'on_delivery', 'delivered', 'picked_up', 'completed', 'cancelled').required(),
  message: Joi.string().max(200).allow('')
});

// Category schemas
const createCategory = Joi.object({
  name: baseSchemas.name.required(),
  nameUz: baseSchemas.name,
  nameRu: baseSchemas.name,
  nameEn: baseSchemas.name,
  emoji: Joi.string().max(10),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

const updateCategory = createCategory.fork(['name'], (schema) => schema.optional());

// Branch schemas
const createBranch = Joi.object({
  name: baseSchemas.name.required(),
  title: baseSchemas.name,
  address: Joi.object({
    text: baseSchemas.address.required(),
    coordinates: baseSchemas.coordinates.required()
  }).required(),
  phone: baseSchemas.phone.required(),
  workingHours: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
  }),
  isActive: Joi.boolean().default(true)
});

const updateBranch = createBranch.fork(['name', 'address', 'phone'], (schema) => schema.optional());

// Inventory schemas
const updateInventory = Joi.object({
  isAvailable: Joi.boolean(),
  priceOverride: Joi.number().min(0).allow(null),
  discountType: Joi.string().valid('percent', 'amount'),
  discountValue: Joi.number().min(0),
  promoStart: Joi.date().iso(),
  promoEnd: Joi.date().iso().greater(Joi.ref('promoStart')),
  isPromoActive: Joi.boolean().default(false)
});

// Query validation schemas
const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('createdAt', 'updatedAt', 'name', 'price').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

const orderFiltersQuery = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'assigned', 'preparing', 'ready', 'on_delivery', 'delivered', 'picked_up', 'completed', 'cancelled'),
  orderType: Joi.string().valid('delivery', 'pickup', 'dine_in', 'table'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')),
  search: Joi.string().max(100).trim(),
  branch: baseSchemas.objectId,
  courier: Joi.string().valid('assigned', 'unassigned')
}).concat(paginationQuery);

const productFiltersQuery = Joi.object({
  category: baseSchemas.objectId,
  search: Joi.string().max(100).trim(),
  branch: baseSchemas.objectId,
  isActive: Joi.boolean(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0)
}).concat(paginationQuery);

// Parameter validation schemas
const objectIdParam = Joi.object({
  id: baseSchemas.objectId.required()
});

const branchProductParams = Joi.object({
  branchId: baseSchemas.objectId.required(),
  productId: baseSchemas.objectId.required()
});

module.exports = {
  // Base schemas
  baseSchemas,
  
  // Auth
  login,
  register,
  
  // Products
  createProduct,
  updateProduct,
  
  // Orders
  createOrder,
  updateOrderStatus,
  
  // Categories
  createCategory,
  updateCategory,
  
  // Branches
  createBranch,
  updateBranch,
  
  // Inventory
  updateInventory,
  
  // Query filters
  paginationQuery,
  orderFiltersQuery,
  productFiltersQuery,
  
  // Parameters
  objectIdParam,
  branchProductParams
};