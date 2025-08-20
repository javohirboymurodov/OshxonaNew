const mongoose = require('mongoose');

// Per-filial inventar va mavjudlik holati
const branchProductSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  // Filialdagi ko'rinish/mavjudlik
  isAvailable: { type: Boolean, default: true },
  // Ixtiyoriy narx o'zgarishi
  priceOverride: { type: Number, default: null },
  // Promo/chegirma maydonlari
  discountType: { type: String, enum: ['percent', 'amount', null], default: null },
  discountValue: { type: Number, default: null },
  promoStart: { type: Date, default: null },
  promoEnd: { type: Date, default: null },
  isPromoActive: { type: Boolean, default: false },
}, {
  timestamps: true,
});

branchProductSchema.index({ product: 1, branch: 1 }, { unique: true });

module.exports = mongoose.models.BranchProduct || mongoose.model('BranchProduct', branchProductSchema);

