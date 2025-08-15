const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  specialInstructions: String,
  selectedOptions: [{
    optionId: String,
    optionName: String,
    price: Number
  }]
});

const orderSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true  // index: true ni olib tashlash
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Branch of the restaurant this order belongs to
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  
  // Order items
  items: [orderItemSchema],
  
  // Order type
  orderType: { 
    type: String, 
    enum: ['delivery', 'pickup', 'dine_in', 'table'], 
    required: true
  },
  
  // Customer information
  customerInfo: {
    name: { type: String, required: true },
    phone: String,
    email: String
  },
  
  // Delivery/pickup information
  deliveryInfo: {
    address: String,
    location: {
      latitude: Number,
      longitude: Number
    },
    instructions: String,
    estimatedTime: Date,
    actualTime: Date,
    courier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Dine-in information
  dineInInfo: {
    tableNumber: String,
    arrivalTime: String,
    guestCount: Number,
    waiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Pricing
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 0 },
  serviceFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  // Payment
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'click', 'payme', 'uzcard', 'humo'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'on_delivery', 'delivered', 'picked_up', 'completed', 'cancelled', 'refunded'], 
    default: 'pending'
  },
  
  // Timestamps
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  preparationStartTime: Date,
  readyTime: Date,
  
  // Additional info
  notes: String,
  adminNotes: String,
  
  // Rating and feedback
  rating: { type: Number, min: 1, max: 5 },
  feedback: String,
  
  // Status history
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: String
  }]
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Faqat kerakli indexlar
orderSchema.index({ user: 1 });
orderSchema.index({ branch: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ orderType: 1 });

// Pre-save middleware
orderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Overwrite xatosini oldini olish
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);