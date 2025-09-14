const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const isDebug = process.env.NODE_ENV === 'development' || process.env.API_DEBUG === 'true';
    
    if (isDebug) {
      console.log('🔍 AUTH DEBUG - Request:', {
        url: req.url,
        method: req.method,
        hasAuthHeader: !!req.header('Authorization')
      });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      if (isDebug) console.log('❌ AUTH DEBUG - No token provided');
      return res.status(401).json({
        success: false,
        message: 'Token topilmadi, ruxsat berilmadi!'
      });
    }

    // FIXED: Fallback JWT_SECRET - eng yaxshi variant!
    const JWT_SECRET = process.env.JWT_SECRET || 'oshxona_jwt_secret_key_2025_development_only';
    if (isDebug) {
      console.log('🔍 JWT_SECRET status:', JWT_SECRET ? 'LOADED' : 'MISSING');
      console.log('🔍 Token length:', token.length);
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    if (isDebug) {
      console.log('✅ AUTH DEBUG - JWT decoded successfully:', {
        userId: decoded.userId || decoded.id,
        role: decoded.role,
        email: decoded.email
      });
    }
    
    // Try to get user from database, fallback to JWT data
    let user;
    try {
      user = await User.findById(decoded.userId || decoded.id).select('-password');
      if (user && isDebug) {
        console.log('✅ User found in database:', user.email);
      }
    } catch (dbError) {
      if (isDebug) console.warn('⚠️ Database not available, using JWT data:', dbError.message);
    }
    
    if (!user) {
      // Fallback: use data from JWT token
      if (isDebug) console.log('🔄 Using JWT fallback data');
      user = {
        _id: decoded.userId || decoded.id,
        firstName: decoded.firstName || 'User',
        lastName: decoded.lastName || '',
        email: decoded.email,
        role: decoded.role,
        branch: decoded.branch,
        isActive: true // Assume active if in valid JWT
      };
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hisobingiz faol emas!'
      });
    }

    req.user = user;
    if (isDebug) console.log('✅ Auth successful for:', user.email);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.name, error.message);
    
    let message = 'Token noto\'g\'ri!';
    if (error.name === 'TokenExpiredError') {
      message = 'Token muddati tugagan!';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Token formati noto\'g\'ri!';
    }
    
    return res.status(401).json({
      success: false,
      message,
      error: error.name,
      debug: {
        jwtSecretExists: !!(process.env.JWT_SECRET || 'oshxona_jwt_secret_key_2025_development_only'),
        tokenLength: req.header('Authorization')?.replace('Bearer ', '').length || 0
      }
    });
  }
};

// Role-based middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autentifikatsiya talab qilinadi!'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Bu amalni bajarish uchun ruxsat yo\'q!'
      });
    }

    next();
  };
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin ruxsati kerak!'
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