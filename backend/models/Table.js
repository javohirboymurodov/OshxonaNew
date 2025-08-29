const mongoose = require('mongoose');

// stolda qr kod orqali zakaz qilish uchun table modeli
const tableSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  number: { 
    type: Number, 
    required: true
  },
  qrCode: { 
    type: String,
    default: function() {
      // Fallback: table number + branch id
      const num = this.number || 'X';
      const br = this.branch ? String(this.branch) : 'default';
      return `table_${num}_b_${br}`;
    },
  },
  capacity: { type: Number, required: true },
  location: String,
  isActive: { type: Boolean, default: true },
  isOccupied: { type: Boolean, default: false },
  
  // Current session
  currentSession: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: Date,
    guestCount: Number
  },
  
  // Statistics
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageSessionTime: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Overwrite xatosini oldini olish
module.exports = mongoose.models.Table || mongoose.model('Table', tableSchema);