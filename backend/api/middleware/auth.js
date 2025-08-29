const jwt = require('jsonwebtoken');
const { User } = require('../../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token topilmadi, ruxsat berilmadi!'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId || decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token noto\'g\'ri!'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hisobingiz faol emas!'
      });
    }

    req.user = {
      _id: user._id,
      userId: user._id,
      role: user.role,
      email: user.email,
      branch: user.branch || null
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token noto\'g\'ri!'
    });
  }
};

// Role-based middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu amalni bajarish uchun ruxsatingiz yo\'q!'
      });
    }
    next();
  };
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  const role = req.user.role;
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Admin ruxsati kerak!'
    });
  }
  // Admin (superadmin emas) bo'lsa, majburiy ravishda filialga biriktirilgan bo'lishi shart
  if (role === 'admin' && !req.user.branch) {
    return res.status(403).json({
      success: false,
      message: 'Admin uchun filial (branch) biriktirilmagan. Iltimos, superadmin orqali filial bering.'
    });
  }
  next();
};

// SuperAdmin middleware
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'SuperAdmin ruxsati kerak!'
    });
  }
  next();
};

module.exports = {
  authenticateToken: auth,
  requireRole,
  requireAdmin,
  requireSuperAdmin
};