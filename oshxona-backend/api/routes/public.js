// api/routes/public.js
const express = require('express');
const Branch = require('../../models/Branch');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const User = require('../../models/User');

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

// GET /api/public/branches - Get all active branches (telegram ID required)
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true })
      .select('_id name title address phone coordinates')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Public branches error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/public/categories - Get all active categories (telegram ID required)
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('_id name description')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Public categories error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/public/products - Get products by branch/category (telegram ID required)
router.get('/products', async (req, res) => {
  try {
    const { branch, category, page = 1, limit = 50 } = req.query;
    
    let query = { isActive: true };
    
    // Branch filter
    if (branch) {
      query.branch = branch;
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.categoryId = category;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .populate('branch', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        items: products,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Public products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
