/**
 * Courier Modules - Central Export
 * Kuryer modullari - markaziy export
 * 
 * Bu fayl barcha kuryer modullarini bitta joydan export qiladi
 */

const authHandlers = require('./authHandlers');
const shiftHandlers = require('./shiftHandlers');
const profileHandlers = require('./profileHandlers');
const orderHandlers = require('./orderHandlers');

module.exports = {
  // Authentication - autentifikatsiya
  ensureCourierByTelegram: authHandlers.ensureCourierByTelegram,
  normalizePhone: authHandlers.normalizePhone,
  bindByPhone: authHandlers.bindByPhone,
  start: authHandlers.start,
  
  // Shift Management - ish vaqti boshqaruvi
  toggleShift: shiftHandlers.toggleShift,
  startWork: shiftHandlers.startWork,
  stopWork: shiftHandlers.stopWork,
  toggleAvailable: shiftHandlers.toggleAvailable,
  
  // Profile & Stats - profil va statistika
  activeOrders: profileHandlers.activeOrders,
  earnings: profileHandlers.earnings,
  profile: profileHandlers.profile,
  
  // Order Operations - buyurtma operatsiyalari
  acceptOrder: orderHandlers.acceptOrder,
  onWay: orderHandlers.onWay,
  delivered: orderHandlers.delivered,
  cancelOrder: orderHandlers.cancelOrder,
  orderDetails: orderHandlers.orderDetails,
  
  // Direct access to modules - to'g'ridan-to'g'ri kirish
  auth: authHandlers,
  shift: shiftHandlers,
  profile: profileHandlers,
  order: orderHandlers
};