const express = require('express');
const { User } = require('../../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// Get users with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 15, role } = req.query;
    const branchId = req.user.branch;

    let query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Admin faqat o'z filialidagi foydalanuvchilarni ko'rishi
    if (req.user.role === 'admin') {
      query.$or = [
        { branch: branchId },
        { role: 'user' } // Barcha oddiy userlar
      ];
    }

    const users = await User.find(query)
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Foydalanuvchilarni olishda xatolik!'
    });
  }
});

// Get user stats
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.user.branch;
    
    let query = {};
    if (req.user.role === 'admin') {
      query.$or = [
        { branch: branchId },
        { role: 'user' }
      ];
    }

    const [
      total,
      active,
      blocked,
      admins,
      couriers,
      thisMonth
    ] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ ...query, isActive: true }),
      User.countDocuments({ ...query, isBlocked: true }),
      User.countDocuments({ ...query, role: 'admin' }),
      User.countDocuments({ ...query, role: 'courier' }),
      User.countDocuments({
        ...query,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          total,
          active,
          blocked,
          admins,
          couriers,
          newThisMonth: thisMonth
        }
      }
    });

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik!'
    });
  }
});

module.exports = router;