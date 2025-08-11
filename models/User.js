const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: Number
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    // Admin/SuperAdmin uchun required, user uchun null
    required: function() {
      return ['admin', 'superadmin'].includes(this.role);
    }
  },
  phone: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    enum: ['uz', 'ru', 'en'],
    default: 'uz'
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin', 'courier'],
    default: 'user'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    // Admin uchun required
    required: function() {
      return this.role === 'admin';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  
  // Courier-specific fields
  courierInfo: {
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'motorcycle', 'scooter'],
      required: function() { return this.role === 'courier'; }
    },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date
    },
    isAvailable: { type: Boolean, default: true },
    rating: { type: Number, default: 5.0, min: 1, max: 5 },
    totalDeliveries: { type: Number, default: 0 }
  },

  // Existing fields...
  address: {
    street: String,
    city: String,
    district: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderDate: Date
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'uz' },
    favoriteCategories: [String]
  }
}, {
  timestamps: true
});

// Password hash middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);