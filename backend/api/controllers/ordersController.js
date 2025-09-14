/**
 * Orders Controller
 * Buyurtma controller'i - asosiy funksiyalar
 */

const { Order, User, Branch } = require('../../models');
const QueryOptimizer = require('../../utils/QueryOptimizer');
const ErrorHandler = require('../../utils/ErrorHandler');

/**
 * Buyurtmalar ro'yxatini olish
 */
async function listOrders(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    
    const orders = await QueryOptimizer.findOrdersByStatus(
      status, 
      branchId, 
      parseInt(limit), 
      true
    );
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: orders.length
      }
    });
  } catch (error) {
    ErrorHandler.log(error, { action: 'listOrders', user: req.user._id });
    res.status(500).json({
      success: false,
      error: 'Buyurtmalar ro\'yxatini olishda xatolik'
    });
  }
}

/**
 * Buyurtma statistikalarini olish
 */
async function getStats(req, res) {
  try {
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    
    const stats = await Promise.all([
      QueryOptimizer.findOrdersByStatus('pending', branchId, 100, true),
      QueryOptimizer.findOrdersByStatus('confirmed', branchId, 100, true),
      QueryOptimizer.findOrdersByStatus('delivered', branchId, 100, true),
      QueryOptimizer.findOrdersByStatus('cancelled', branchId, 100, true)
    ]);
    
    res.json({
      success: true,
      data: {
        pending: stats[0].length,
        confirmed: stats[1].length,
        delivered: stats[2].length,
        cancelled: stats[3].length,
        total: stats.reduce((sum, arr) => sum + arr.length, 0)
      }
    });
  } catch (error) {
    ErrorHandler.log(error, { action: 'getStats', user: req.user._id });
    res.status(500).json({
      success: false,
      error: 'Statistikalarni olishda xatolik'
    });
  }
}

/**
 * Bitta buyurtmani olish
 */
async function getOrder(req, res) {
  try {
    const { id } = req.params;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    
    let query = { _id: id };
    if (branchId) query.branch = branchId;
    
    const order = await Order.findOne(query)
      .populate('user', 'firstName lastName phone telegramId')
      .populate('branch', 'name address phone')
      .populate('deliveryInfo.courier', 'firstName lastName phone')
      .populate('items.productId', 'name price image')
      .lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Buyurtma topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    ErrorHandler.log(error, { action: 'getOrder', user: req.user._id, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Buyurtma ma\'lumotlarini olishda xatolik'
    });
  }
}

/**
 * Buyurtma status'ini yangilash
 */
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, message } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    
    let query = { _id: id };
    if (branchId) query.branch = branchId;
    
    const order = await Order.findOneAndUpdate(
      query,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Buyurtma topilmadi'
      });
    }
    
    // Cache'ni tozalash
    QueryOptimizer.clearOrderCache(order._id, order.branch, order.user);
    
    res.json({
      success: true,
      data: order,
      message: message || 'Status yangilandi'
    });
  } catch (error) {
    ErrorHandler.log(error, { action: 'updateStatus', user: req.user._id, orderId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Status yangilashda xatolik'
    });
  }
}

module.exports = {
  listOrders,
  getStats,
  getOrder,
  updateStatus
};