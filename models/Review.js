const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Review ID
  reviewId: {
    type: String,
    unique: true,
    sparse: true  // null qiymatlar uchun
  },
  
  // Foydalanuvchi ma'lumotlari
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Buyurtma ma'lumotlari (ixtiyoriy qilamiz)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  // Mahsulot
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Reyting (1-5 yulduz)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Sharh matni
  comment: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Tavsiya qiladi-yu?
  recommend: {
    type: Boolean,
    default: true
  },
  
  // Review turlari
  type: {
    type: String,
    enum: ['product', 'service', 'delivery', 'overall'],
    default: 'product'
  },
  
  // Baholash mezonlari (oshxona uchun)
  criteria: {
    taste: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    presentation: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    speed: { type: Number, min: 1, max: 5 },
    price: { type: Number, min: 1, max: 5 }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'hidden'],
    default: 'approved'  // Default approved qilamiz
  }
}, {
  timestamps: true
});

// Pre-save middleware - reviewId yaratish
reviewSchema.pre('save', function(next) {
  if (!this.reviewId) {
    this.reviewId = 'REV' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Indexlar
reviewSchema.index({ user: 1, product: 1 });
reviewSchema.index({ product: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1 });

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);