const mongoose = require('mongoose');

// Per-filial inventar va mavjudlik holati
const branchProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  // Filialdagi ko'rinish/mavjudlik
  isAvailable: { type: Boolean, default: true },
  stock: { type: Number, default: null }, // null => cheksiz/qo'llanmaydi
  dailyLimit: { type: Number, default: null },
  soldToday: { type: Number, default: 0 },
  lastResetAt: { type: Date, default: null },
  // Ixtiyoriy narx o'zgarishi
  priceOverride: { type: Number, default: null },
}, {
  timestamps: true,
});

branchProductSchema.index({ product: 1, branch: 1 }, { unique: true });

module.exports = mongoose.models.BranchProduct || mongoose.model('BranchProduct', branchProductSchema);

