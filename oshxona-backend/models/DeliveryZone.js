const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema({
  // Zona nomi
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  nameRu: {
    type: String,
    trim: true
  },
  
  // Tavsif
  description: {
    type: String,
    maxlength: 200
  },
  
  // Zona koordinatalari (Polygon)
  coordinates: [{
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  }],
  // Bog'liq filial
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  
  // Yetkazib berish narxi
  deliveryFee: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Bepul yetkazib berish chegarasi
  freeDeliveryAmount: {
    type: Number,
    default: 0
  },
  
  // Minimal buyurtma miqdori
  minOrderAmount: {
    type: Number,
    default: 0
  },
  
  // Maksimal buyurtma og'irligi (kg)
  maxWeight: {
    type: Number,
    default: 50
  },
  
  // Yetkazib berish vaqti (daqiqalarda)
  estimatedTime: {
    type: Number,
    required: true
  },
  
  // Ish vaqti
  workingHours: {
    monday: { start: String, end: String, isActive: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, isActive: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, isActive: { type: Boolean, default: true } },
    thursday: { start: String, end: String, isActive: { type: Boolean, default: true } },
    friday: { start: String, end: String, isActive: { type: Boolean, default: true } },
    saturday: { start: String, end: String, isActive: { type: Boolean, default: true } },
    sunday: { start: String, end: String, isActive: { type: Boolean, default: false } }
  },
  
  // Mavjud kurierlar
  availableCouriers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Zona prioriteti
  priority: {
    type: Number,
    default: 1
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Maxsus shartlar
  specialConditions: [{
    condition: String,
    extraFee: Number,
    description: String
  }],
  
  // Statistika
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }
  }
  
}, {
  timestamps: true
});

// Indexlar
deliveryZoneSchema.index({ name: 1 });
deliveryZoneSchema.index({ isActive: 1 });
deliveryZoneSchema.index({ priority: 1 });
deliveryZoneSchema.index({ branch: 1 });

// Virtual - zona maydoni (taxminiy)
deliveryZoneSchema.virtual('estimatedArea').get(function() {
  if (this.coordinates.length < 3) return 0;
  
  // Oddiy polygon maydoni hisobi (Shoelace formula)
  let area = 0;
  const coords = this.coordinates;
  
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i].latitude * coords[j].longitude;
    area -= coords[j].latitude * coords[i].longitude;
  }
  
  return Math.abs(area) / 2;
});

// Methods
deliveryZoneSchema.methods.isPointInZone = function(latitude, longitude) {
  // Ray casting algorithm
  let inside = false;
  const coords = this.coordinates;
  
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    if (((coords[i].latitude > latitude) !== (coords[j].latitude > latitude)) &&
        (longitude < (coords[j].longitude - coords[i].longitude) * 
         (latitude - coords[i].latitude) / (coords[j].latitude - coords[i].latitude) + coords[i].longitude)) {
      inside = !inside;
    }
  }
  
  return inside;
};

deliveryZoneSchema.methods.calculateDeliveryFee = function(orderAmount, weight = 0) {
  let fee = this.deliveryFee;
  
  // Bepul yetkazib berish
  if (orderAmount >= this.freeDeliveryAmount) {
    fee = 0;
  }
  
  // Og'irlik bo'yicha qo'shimcha haq
  if (weight > 10) {
    fee += Math.ceil((weight - 10) / 5) * 2000; // Har 5kg uchun 2000 so'm
  }
  
  // Maxsus shartlar
  this.specialConditions.forEach(condition => {
    // Bu yerda maxsus shartlar logikasi bo'lishi mumkin
    if (condition.extraFee) {
      fee += condition.extraFee;
    }
  });
  
  return fee;
};

deliveryZoneSchema.methods.isWorkingNow = function() {
  const now = new Date();
  // weekday value must be one of: 'long' | 'short' | 'narrow'
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
    .format(now)
    .toLowerCase(); // 'monday' | 'tuesday' ...
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const daySchedule = this.workingHours?.[dayName];

  if (!daySchedule || daySchedule.isActive === false) return false;
  if (!daySchedule.start || !daySchedule.end) return true;

  return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
};

// Static methods
deliveryZoneSchema.statics.findZoneByCoordinates = function(latitude, longitude) {
  return this.find({ isActive: true }).then(zones => {
    return zones.find(zone => zone.isPointInZone(latitude, longitude));
  });
};

deliveryZoneSchema.statics.getAvailableZones = function() {
  return this.find({ 
    isActive: true 
  }).sort({ priority: 1, name: 1 });
};

module.exports = mongoose.models.DeliveryZone || mongoose.model('DeliveryZone', deliveryZoneSchema);