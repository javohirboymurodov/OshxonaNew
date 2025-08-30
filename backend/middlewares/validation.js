// middleware/validation.js
const Joi = require('joi');

// Common validation schemas
const schemas = {
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
  address: Joi.string().min(5).max(200).trim(),
  orderType: Joi.string().valid('delivery', 'pickup', 'dine_in', 'table'),
  orderStatus: Joi.string().valid('pending', 'confirmed', 'assigned', 'preparing', 'ready', 'on_delivery', 'delivered', 'picked_up', 'completed', 'cancelled'),
  paymentMethod: Joi.string().valid('cash', 'card', 'online', 'terminal'),
  discountType: Joi.string().valid('percent', 'amount'),
  role: Joi.string().valid('user', 'admin', 'superadmin', 'courier')
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Ma\'lumotlarda xatolik!',
        errors: errorDetails
      });
    }

    // Replace original with validated value
    req[property] = value;
    next();
  };
};

// Specific validation middlewares
const validateLogin = validate(Joi.object({
  phone: schemas.phone.required(),
  password: schemas.password.required()
}));

const validateRegister = validate(Joi.object({
  firstName: schemas.name.required(),
  lastName: schemas.name.allow(''),
  phone: schemas.phone.required(),
  password: schemas.password.required(),
  role: schemas.role.default('user')
}));

const validateProduct = validate(Joi.object({
  name: schemas.name.required(),
  description: schemas.description,
  price: schemas.price.required(),
  categoryId: schemas.objectId.required(),
  preparationTime: Joi.number().integer().min(1).max(120).default(15),
  isActive: Joi.boolean().default(true),
  isPopular: Joi.boolean().default(false),
  isFeatured: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  ingredients: Joi.array().items(Joi.string().trim()).default([]),
  allergens: Joi.array().items(Joi.string().trim()).default([])
}));

const validateOrder = validate(Joi.object({
  orderType: schemas.orderType.required(),
  items: Joi.array().items(Joi.object({
    product: schemas.objectId.required(),
    quantity: schemas.quantity.required(),
    price: schemas.price.required()
  })).min(1).required(),
  totalAmount: schemas.price.required(),
  deliveryInfo: Joi.when('orderType', {
    is: 'delivery',
    then: Joi.object({
      address: schemas.address.required(),
      location: schemas.coordinates.required(),
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
  paymentMethod: schemas.paymentMethod.required()
}));

const validateOrderStatus = validate(Joi.object({
  status: schemas.orderStatus.required(),
  message: Joi.string().max(200).allow('')
}));

const validateCategory = validate(Joi.object({
  name: schemas.name.required(),
  nameUz: schemas.name,
  nameRu: schemas.name,
  nameEn: schemas.name,
  emoji: Joi.string().max(10),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
}));

const validateBranch = validate(Joi.object({
  name: schemas.name.required(),
  title: schemas.name,
  address: Joi.object({
    text: schemas.address.required(),
    coordinates: schemas.coordinates.required()
  }).required(),
  phone: schemas.phone.required(),
  workingHours: Joi.object({
    open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
  }),
  isActive: Joi.boolean().default(true)
}));

const validateInventory = validate(Joi.object({
  isAvailable: Joi.boolean(),
  priceOverride: Joi.number().min(0).allow(null),
  discountType: schemas.discountType,
  discountValue: Joi.number().min(0),
  promoStart: Joi.date().iso(),
  promoEnd: Joi.date().iso().greater(Joi.ref('promoStart')),
  isPromoActive: Joi.boolean().default(false)
}));

// Query parameter validation
const validateQuery = (schema) => validate(schema, 'query');

const validatePagination = validateQuery(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('createdAt', 'updatedAt', 'name', 'price').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
}));

const validateOrderFilters = validateQuery(Joi.object({
  status: schemas.orderStatus,
  orderType: schemas.orderType,
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')),
  search: Joi.string().max(100).trim(),
  branch: schemas.objectId,
  courier: Joi.string().valid('assigned', 'unassigned')
}).concat(schemas.objectId.optional()));

// Parameters validation
const validateParams = (schema) => validate(schema, 'params');

const validateObjectIdParam = validateParams(Joi.object({
  id: schemas.objectId.required()
}));

module.exports = {
  // Schemas
  schemas,
  
  // General validation
  validate,
  validateQuery,
  validateParams,
  
  // Specific validations
  validateLogin,
  validateRegister,
  validateProduct,
  validateOrder,
  validateOrderStatus,
  validateCategory,
  validateBranch,
  validateInventory,
  validatePagination,
  validateOrderFilters,
  validateObjectIdParam
};