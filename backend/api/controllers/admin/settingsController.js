/**
 * Admin Settings Controller
 * Admin sozlamalar operatsiyalari
 */

/**
 * Tizim sozlamalarini olish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getSettings(req, res) {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Sozlamalar faqat SuperAdmin uchun!' 
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        appSettings: { 
          restaurantName: 'Oshxona', 
          currency: 'UZS', 
          timezone: 'Asia/Tashkent' 
        }, 
        notifications: { 
          newOrderNotification: true, 
          orderStatusNotification: true 
        } 
      } 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Sozlamalarni olishda xatolik!' 
    });
  }
}

module.exports = {
  getSettings
};