const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'free_delivery'],
    required: true
  },
  value: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: Number,
  
  // Validity
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  
  // Usage limits
  usageLimit: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  
  // Applicability
  applicableCategories: [String],
  applicableProducts: [String],
  applicableUserTypes: [String],
  
  // Description
  title: String,
  description: String,
  
  // Statistics
  stats: {
    totalUsage: { type: Number, default: 0 },
    totalSavings: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

promoCodeSchema.index({ isActive: 1 });
promoCodeSchema.index({ startDate: 1, endDate: 1 });

// Overwrite xatosini oldini olish
module.exports = mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);