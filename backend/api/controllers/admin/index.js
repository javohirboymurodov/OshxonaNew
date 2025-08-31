/**
 * Admin Controllers Module - Central Export
 * Admin controllerlar moduli - markaziy export
 * 
 * Bu fayl barcha admin operatsiyalarini bitta joydan export qiladi
 */

const dashboardController = require('./dashboardController');
const branchController = require('./branchControllers');
const productController = require('./productController');
const categoryController = require('./categoryController');
const orderController = require('./orderController');
const inventoryController = require('./inventoryController');
const settingsController = require('./settingsController');

module.exports = {
  // Dashboard operations - dashboard operatsiyalari
  getDashboard: dashboardController.getDashboard,
  
  // Branch operations - filial operatsiyalari
  getBranches: branchController.getBranches,
  
  // Product operations - mahsulot operatsiyalari
  getProducts: productController.getProducts,
  toggleProductStatus: productController.toggleProductStatus,
  createProduct: productController.createProduct,
  deleteProduct: productController.deleteProduct,
  updateProduct: productController.updateProduct,
  
  // Category operations - kategoriya operatsiyalari
  getCategories: categoryController.getCategories,
  createCategory: categoryController.createCategory,
  updateCategory: categoryController.updateCategory,
  
  // Order operations - buyurtma operatsiyalari
  getOrders: orderController.getOrders,
  getOrdersStats: orderController.getOrdersStats,
  
  // Inventory operations - inventar operatsiyalari
  updateInventory: inventoryController.updateInventory,
  getInventory: inventoryController.getInventory,
  
  // Settings operations - sozlamalar operatsiyalari
  getSettings: settingsController.getSettings,
  
  // Direct access to controllers - to'g'ridan-to'g'ri kirish
  dashboard: dashboardController,
  branch: branchController,
  product: productController,
  category: categoryController,
  order: orderController,
  inventory: inventoryController,
  settings: settingsController
};