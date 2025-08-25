// api/routes/products.js
const express = require('express');
const { authenticateToken, requireRole, requireAdmin } = require('../middleware/auth');
const ProductsController = require('../controllers/productsController');
const SecurityService = require('../../middleware/security');
const validationSchemas = require('../../middleware/validationSchemas');

// Local upload config'dan import qilish
const { 
  uploadSingle, 
  uploadMultiple, 
  handleUploadError 
} = require('../../config/localUploadConfig');

const { CacheHelper } = require('../../services/cacheService');

const router = express.Router();

// GET /api/products - Get all products with pagination and caching
router.get('/', ProductsController.list);



// GET /api/products/:id - Get single product
router.get('/:id', ProductsController.getOne);

// POST /api/products - Create new product with local upload
router.post('/', 
  authenticateToken, 
  requireRole(['superadmin', 'admin']), 
  SecurityService.getFileUploadRateLimit(),
  uploadSingle, 
  handleUploadError, 
  SecurityService.requestValidator(validationSchemas.createProduct),
  ProductsController.create
);

// PUT /api/products/:id - Update product with image replacement
router.put('/:id', 
  authenticateToken, 
  requireRole(['superadmin', 'admin']), 
  SecurityService.getFileUploadRateLimit(),
  uploadSingle, 
  SecurityService.requestValidator(validationSchemas.updateProduct),
  ProductsController.update
);

// DELETE /api/products/:id - Delete product with image
router.delete('/:id', authenticateToken, requireRole(['superadmin', 'admin']), ProductsController.remove);

module.exports = router;