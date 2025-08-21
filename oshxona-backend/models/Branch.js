const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    district: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  phone: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  workingHours: {
    monday: { open: String, close: String, isOpen: Boolean },
    tuesday: { open: String, close: String, isOpen: Boolean },
    wednesday: { open: String, close: String, isOpen: Boolean },
    thursday: { open: String, close: String, isOpen: Boolean },
    friday: { open: String, close: String, isOpen: Boolean },
    saturday: { open: String, close: String, isOpen: Boolean },
    sunday: { open: String, close: String, isOpen: Boolean }
  },
  deliveryZones: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryZone'
  }],
  settings: {
    minOrderAmount: { type: Number, default: 50000 },
    deliveryFee: { type: Number, default: 15000 },
    freeDeliveryAmount: { type: Number, default: 200000 },
    maxDeliveryDistance: { type: Number, default: 15 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Branch', branchSchema);