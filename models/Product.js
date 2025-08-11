const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String },
  nameRu: String,
  nameEn: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: String,
  descriptionRu: String,
  descriptionEn: String,
  
  // Price and availability
  price: { type: Number, min: 0 },
  originalPrice: Number,
  preparationTime: { type: Number, default: 15 },
  
  // Images
  image: String,
  images: [String],
  imageFileId: String, // Telegram file ID for storing image on Telegram servers
  imagePath: String,   // Local file path if we store locally
  
  // Product options
  ingredients: [String],
  allergens: [String],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  
  // Status flags
  isActive: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isNewProduct: { type: Boolean, default: false },
  
  // Ordering
  sortOrder: { type: Number, default: 0 },
  
  // Statistics
  stats: {
    orderCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 }
  },
  
  // Additional info
  tags: [String],
  weight: Number,
  unit: { type: String, default: 'portion' },
  minOrderQuantity: { type: Number, default: 1 },
  maxOrderQuantity: { type: Number, default: 50 }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Indexlar
productSchema.index({ categoryId: 1 });
productSchema.index({ isActive: 1, isAvailable: 1 });
productSchema.index({ isPopular: 1 });
productSchema.index({ price: 1 });

// Virtual fields
productSchema.virtual('formattedPrice').get(function() {
  return this.price.toLocaleString('uz-UZ') + ' so\'m';
});

productSchema.virtual('isOnSale').get(function() {
  return this.originalPrice && this.originalPrice > this.price;
});

productSchema.virtual('discountPercentage').get(function() {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Methods
productSchema.methods.incrementOrderCount = function() {
  this.stats.orderCount += 1;
  return this.save();
};

productSchema.methods.incrementViewCount = function() {
  this.stats.viewCount += 1;
  return this.save();
};

// Model yaratish - overwrite xatosini oldini olish
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);