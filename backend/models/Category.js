const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameUz: String,
  nameRu: String,
  nameEn: String,
  emoji: String,
  description: String,
  descriptionRu: String,
  descriptionEn: String,
  image: String,
  
  // Visibility settings
  isActive: { type: Boolean, default: true },
  isVisible: { type: Boolean, default: true },
  
  // Ordering
  sortOrder: { type: Number, default: 0 },
  
  // Statistics
  stats: {
    totalProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Faqat kerakli indexlar
categorySchema.index({ isActive: 1, isVisible: 1 });
categorySchema.index({ sortOrder: 1 });

// Overwrite xatosini oldini olish
module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);