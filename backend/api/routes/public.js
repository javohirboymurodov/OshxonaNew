// api/routes/public.js
const express = require('express');
const Branch = require('../../models/Branch');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const User = require('../../models/User');
const Database = require('../../config/database');

const router = express.Router();

// Middleware: Telegram ID validation
const validateTelegramId = async (req, res, next) => {
  try {
    const { telegramId } = req.query;
    
    if (!telegramId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Telegram ID kerak!' 
      });
    }

    // User mavjudligini tekshirish - telegramId ni number ga o'tkazish
    const telegramIdNum = parseInt(telegramId);
    if (isNaN(telegramIdNum)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Noto\'g\'ri Telegram ID format!' 
      });
    }

    const user = await User.findOne({ telegramId: telegramIdNum });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Foydalanuvchi topilmadi!' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Telegram ID validation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper: DB readiness
function ensureDbReady(res) {
  const dbStatus = Database.getConnectionStatus();
  if (!dbStatus.isConnected || dbStatus.readyState !== 1) {
    console.log('❌ Database not ready');
    res.status(503).json({ 
      success: false, 
      message: 'Database hali tayyor emas. Iltimos, biroz kutib qayta urinib ko\'ring.',
      retryAfter: 5,
      status: dbStatus
    });
    return false;
  }
  return true;
}

// Handlers
const getBranchesHandler = async (req, res) => {
  try {
    console.log('🔍 Fetching branches...');
    if (!ensureDbReady(res)) return;
    const totalBranches = await Branch.countDocuments();
    const branches = await Branch.find({ isActive: true })
      .select('_id name title address phone coordinates')
      .sort({ name: 1 });
    res.json({ success: true, data: branches, total: totalBranches, active: branches.length });
  } catch (error) {
    console.error('Public branches error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
};

const getCategoriesHandler = async (req, res) => {
  try {
    console.log('🔍 Fetching categories...');
    if (!ensureDbReady(res)) return;
    const totalCategories = await Category.countDocuments();
    const categories = await Category.find({ isActive: true })
      .select('_id name description')
      .sort({ name: 1 });
    res.json({ success: true, data: categories, total: totalCategories, active: categories.length });
  } catch (error) {
    console.error('Public categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
};

const getProductsHandler = async (req, res) => {
  try {
    console.log('🔍 Fetching products...');
    if (!ensureDbReady(res)) return;
    const { branch, category, page = 1, limit = 50 } = req.query;
    let query = { isActive: true };
    if (branch) query.branch = branch;
    if (category && category !== 'all') query.categoryId = category;
    const totalProducts = await Product.countDocuments();
    console.log(`📊 Total products in DB: ${totalProducts}`);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('branch', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    const total = await Product.countDocuments(query);
    res.json({ success: true, data: { items: products, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    console.error('Public products error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
};

// Routes
// Branches
router.get('/branches', getBranchesHandler);

// Categories
router.get('/categories', getCategoriesHandler);

// Products
router.get('/products', getProductsHandler);

// WebApp data endpoint
router.post('/webapp-data', async (req, res) => {
  try {
    const { telegramId, data } = req.body;
    
    if (!telegramId || !data) {
      return res.status(400).json({
        success: false,
        message: 'Telegram ID va data kerak!'
      });
    }

    console.log('🌐 WebApp data received via API:', {
      telegramId,
      data: JSON.parse(data)
    });

    // Bot ga ma'lumotlarni yuborish
    const { bot } = require('../../bot/botManager');
    if (bot) {
      // Simulate web_app_data update
      const mockCtx = {
        updateType: 'web_app_data',
        webAppData: { data: data },
        from: { id: parseInt(telegramId) }
      };

      const { handleWebAppData } = require('../../bot/handlers/user/webAppHandler');
      await handleWebAppData(mockCtx);
      
      res.json({
        success: true,
        message: 'Ma\'lumotlar bot ga yuborildi!'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Bot mavjud emas!'
      });
    }
  } catch (error) {
    console.error('❌ WebApp data API error:', error);
    res.status(500).json({
      success: false,
      message: 'Xatolik yuz berdi!'
    });
  }
});

module.exports = router;
