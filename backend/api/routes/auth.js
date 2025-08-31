const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const { authenticateToken } = require('../../middlewares/apiAuth');

const router = express.Router();

// Login - Admin/SuperAdmin uchun (Email bilan)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("✅ Login request received:", { email, password: '***' });

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email va parol kiritish shart!'
      });
    }

    // User topish - faqat admin/superadmin
    const user = await User.findOne({ 
      email,
      role: { $in: ['admin', 'superadmin'] }
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Noto\'g\'ri email yoki parol!'
      });
    }

    // Parol tekshirish
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Noto\'g\'ri email yoki parol!'
      });
    }

    // Foydalanuvchi faoliyatini tekshirish
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hisobingiz faol emas!'
      });
    }

    // JWT token yaratish
    const token = jwt.sign(
      { 
        userId: user._id, 
        id: user._id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        branch: user.branch || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Parolni javobdan olib tashlash
    user.password = undefined;

    console.log("✅ Login successful for:", user.email, "Role:", user.role);

    // Response
    res.json({
      success: true,
      message: 'Muvaffaqiyatli kirildi!',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          branch: user.branch || null,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi!'
    });
  }
});

// Get current user - FIXED!
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 /ME route called, req.user:', {
      hasUser: !!req.user,
      userId: req.user?._id,
      email: req.user?.email,
      role: req.user?.role
    });

    // FIXED: req.user already contains user data from middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Token noto\'g\'ri!'
      });
    }

    // Return user data directly (middleware already validated it)
    res.json({
      success: true,
      data: {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
        branch: req.user.branch,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi!'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Yangi token yaratish
    const newToken = jwt.sign(
      { 
        userId: user._id, 
        id: user._id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        branch: user.branch || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token yangilandi!',
      data: { 
        token: newToken,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          branch: user.branch || null,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token yangilab bo\'lmadi!'
    });
  }
});

// Logout (token blacklist - keyinchalik qo'shamiz)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Token blacklist qilish logic (keyinchalik)
    res.json({
      success: true,
      message: 'Muvaffaqiyatli chiqildi!'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi!'
    });
  }
});

module.exports = router;