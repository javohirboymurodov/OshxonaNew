const { Order } = require('../../models');
const SocketManager = require('../../config/socketConfig');
const LoyaltyService = require('../../services/loyaltyService');
const User = require('../../models/User');

/**
 * Payments Controller
 * Mark order as paid (webhook or internal confirmation) and award loyalty
 */

async function confirmPaid(req, res) {
  try {
    const { id } = req.params; // order id (mongo _id)

    // Optional webhook secret verification for public endpoints
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!req.user && secret) {
      const provided = req.headers['x-payment-secret'];
      if (!provided || provided !== secret) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    }

    const order = await Order.findById(id).populate('user');
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

    // Update payment status
    order.paymentStatus = 'paid';
    // If order still pending, set confirmed
    if (order.status === 'pending') {
      order.status = 'confirmed';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status: 'confirmed', message: 'To\'lov tasdiqlandi', timestamp: new Date(), updatedBy: req.user?._id });
    }
    order.updatedAt = new Date();
    await order.save();

    // Emit status to user via socket
    try {
      if (order.user) {
        SocketManager.emitStatusUpdate(order.user._id, {
          orderId: order._id,
          orderNumber: order.orderId,
          status: order.status,
          message: 'To\'lov tasdiqlandi',
          updatedAt: new Date()
        });
      }
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    // Award loyalty points and process bonuses
    try {
      await LoyaltyService.processOrderCompletion(order._id);

      // Referral bonus ONLY on first paid order
      try {
        const user = await User.findById(order.user._id);
        if (user && user.referrals && user.referrals.referredBy) {
          const paidOrders = await require('../../models/Order').countDocuments({ user: user._id, paymentStatus: 'paid' });
          if (paidOrders === 1) {
            await LoyaltyService.awardReferralOnFirstOrder(user._id, user.referrals.referredBy);
          }
        }
      } catch (reErr) {
        console.error('Referral first-order bonus error:', reErr);
      }
    } catch (e) {
      console.error('Loyalty processing error:', e);
    }

    return res.json({ success: true, message: 'Order paid and loyalty processed', data: { orderId: order._id } });
  } catch (error) {
    console.error('confirmPaid error:', error);
    return res.status(500).json({ success: false, message: 'Payment confirmation failed' });
  }
}

module.exports = { confirmPaid };


