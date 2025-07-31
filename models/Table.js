const mongoose = require('mongoose');

// stolda qr kod orqali zakaz qilish uchun table modeli
const tableSchema = new mongoose.Schema({
  number: { 
    type: Number, 
    required: true, 
    unique: true
  },
  qrCode: { 
    type: String, 
    unique: true
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