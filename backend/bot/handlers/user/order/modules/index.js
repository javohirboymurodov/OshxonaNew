/**
 * Order Modules - Central Export
 * Buyurtma modullari - markaziy export
 * 
 * Bu fayl order/index.js dagi funksiyalarni modullarga ajratadi
 */

const PhoneHandlers = require('./phoneHandlers');
const DineInHandlers = require('./dineInHandlers');
const LocationHandlers = require('./locationHandlers');

module.exports = {
  // Phone operations - telefon operatsiyalari
  askForPhone: PhoneHandlers.askForPhone,
  
  // Dine-in operations - restoranda ovqatlanish
  handleArrivalTime: DineInHandlers.handleArrivalTime,
  handleDineInTableInput: DineInHandlers.handleDineInTableInput,
  handleDineInArrived: DineInHandlers.handleDineInArrived,
  
  // Location operations - joylashuv operatsiyalari
  processLocation: LocationHandlers.processLocation,
  findNearestBranch: LocationHandlers.findNearestBranch,
  calculateDistance: LocationHandlers.calculateDistance,
  deg2rad: LocationHandlers.deg2rad,
  
  // Direct access to classes - to'g'ridan-to'g'ri kirish
  Phone: PhoneHandlers,
  DineIn: DineInHandlers,
  Location: LocationHandlers
};